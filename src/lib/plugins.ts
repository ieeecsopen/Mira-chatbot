/**
 * Plugin System for MIRA
 * Provides a flexible architecture for extending chatbot capabilities
 */

// ==================== PLUGIN TYPES ====================

export type PluginCategory =
    | 'productivity'
    | 'design'
    | 'development'
    | 'communication'
    | 'utilities'
    | 'entertainment'
    | 'education';

export interface PluginMetadata {
    id: string;
    name: string;
    description: string;
    version: string;
    author: string;
    icon: string; // Lucide icon name or URL
    category: PluginCategory;
    keywords: string[];
    website?: string;

    // Plugin capabilities
    capabilities: {
        canProcessMessages?: boolean;     // Can modify/process user messages
        canModifyResponses?: boolean;     // Can modify AI responses
        canAddSlashCommands?: boolean;    // Can register slash commands
        canAccessDocuments?: boolean;     // Can access uploaded documents
        canGenerateContent?: boolean;     // Can generate images/content
        requiresAuth?: boolean;           // Requires authentication
        requiresApiKey?: boolean;         // Requires separate API key
    };
}

export interface PluginSettings {
    [key: string]: string | number | boolean;
}

export interface SlashCommand {
    command: string;
    description: string;
    usage?: string;
    handler: (args: string, context: PluginContext) => Promise<PluginCommandResult>;
}

export interface PluginContext {
    userId?: string;
    sessionId?: string;
    currentMessage?: string;
    conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
    settings: PluginSettings;
}

export interface PluginCommandResult {
    success: boolean;
    message?: string;
    content?: string;           // Content to insert/display
    imageUrl?: string;          // Generated image URL
    error?: string;
    shouldContinue?: boolean;   // Whether to continue to AI processing
    metadata?: Record<string, unknown>;
}

export interface PluginHooks {
    // Called when plugin is initialized
    onInit?: (context: PluginContext) => Promise<void>;

    // Called when plugin is disabled
    onDestroy?: () => Promise<void>;

    // Called before message is sent to AI
    onBeforeMessage?: (message: string, context: PluginContext) => Promise<{
        message: string;
        shouldContinue: boolean;
        directResponse?: string;
    }>;

    // Called after AI response is received
    onAfterResponse?: (response: string, context: PluginContext) => Promise<{
        response: string;
        additions?: string[];
    }>;

    // Called when documents are uploaded
    onDocumentUpload?: (documents: File[], context: PluginContext) => Promise<void>;
}

export interface Plugin {
    metadata: PluginMetadata;
    settings: {
        schema: PluginSettingSchema[];
        defaults: PluginSettings;
    };
    hooks: PluginHooks;
    commands?: SlashCommand[];
}

export interface PluginSettingSchema {
    key: string;
    label: string;
    type: 'text' | 'number' | 'boolean' | 'select' | 'password';
    description?: string;
    required?: boolean;
    options?: Array<{ value: string; label: string }>; // For select type
    validation?: (value: unknown) => boolean;
}

export interface PluginState {
    id: string;
    enabled: boolean;
    settings: PluginSettings;
    installedAt: number;
    lastUsed?: number;
}

// ==================== PLUGIN MANAGER ====================

const PLUGINS_STORAGE_KEY = 'mira-plugins-state';

class PluginManager {
    private plugins: Map<string, Plugin> = new Map();
    private pluginStates: Map<string, PluginState> = new Map();
    private initialized = false;

    constructor() {
        this.loadStates();
    }

    /**
     * Register a plugin
     */
    register(plugin: Plugin): void {
        if (this.plugins.has(plugin.metadata.id)) {
            console.warn(`Plugin ${plugin.metadata.id} is already registered`);
            return;
        }

        this.plugins.set(plugin.metadata.id, plugin);

        // Initialize state if not exists
        if (!this.pluginStates.has(plugin.metadata.id)) {
            this.pluginStates.set(plugin.metadata.id, {
                id: plugin.metadata.id,
                enabled: false,
                settings: { ...plugin.settings.defaults },
                installedAt: Date.now(),
            });
            this.saveStates();
        }

        console.log(`🔌 Plugin registered: ${plugin.metadata.name}`);
    }

    /**
     * Unregister a plugin
     */
    unregister(pluginId: string): void {
        const plugin = this.plugins.get(pluginId);
        if (plugin) {
            this.disablePlugin(pluginId);
            this.plugins.delete(pluginId);
            this.pluginStates.delete(pluginId);
            this.saveStates();
            console.log(`🔌 Plugin unregistered: ${plugin.metadata.name}`);
        }
    }

    /**
     * Enable a plugin
     */
    async enablePlugin(pluginId: string): Promise<boolean> {
        const plugin = this.plugins.get(pluginId);
        const state = this.pluginStates.get(pluginId);

        if (!plugin || !state) {
            console.warn(`Plugin ${pluginId} not found`);
            return false;
        }

        try {
            // Call onInit hook
            if (plugin.hooks.onInit) {
                await plugin.hooks.onInit({
                    settings: state.settings,
                });
            }

            state.enabled = true;
            this.saveStates();
            console.log(`✅ Plugin enabled: ${plugin.metadata.name}`);
            return true;
        } catch (error) {
            console.error(`Failed to enable plugin ${pluginId}:`, error);
            return false;
        }
    }

    /**
     * Disable a plugin
     */
    async disablePlugin(pluginId: string): Promise<void> {
        const plugin = this.plugins.get(pluginId);
        const state = this.pluginStates.get(pluginId);

        if (!plugin || !state) return;

        try {
            if (plugin.hooks.onDestroy) {
                await plugin.hooks.onDestroy();
            }
        } catch (error) {
            console.error(`Error destroying plugin ${pluginId}:`, error);
        }

        state.enabled = false;
        this.saveStates();
        console.log(`⏹️ Plugin disabled: ${plugin.metadata.name}`);
    }

    /**
     * Update plugin settings
     */
    updateSettings(pluginId: string, settings: Partial<PluginSettings>): void {
        const state = this.pluginStates.get(pluginId);
        if (state) {
            state.settings = { ...state.settings, ...settings };
            this.saveStates();
        }
    }

    /**
     * Get all registered plugins
     */
    getPlugins(): Plugin[] {
        return Array.from(this.plugins.values());
    }

    /**
     * Get enabled plugins
     */
    getEnabledPlugins(): Plugin[] {
        return this.getPlugins().filter(p => {
            const state = this.pluginStates.get(p.metadata.id);
            return state?.enabled;
        });
    }

    /**
     * Get plugin state
     */
    getPluginState(pluginId: string): PluginState | null {
        return this.pluginStates.get(pluginId) || null;
    }

    /**
     * Get all slash commands from enabled plugins
     */
    getSlashCommands(): SlashCommand[] {
        const commands: SlashCommand[] = [];

        for (const plugin of this.getEnabledPlugins()) {
            if (plugin.commands) {
                commands.push(...plugin.commands);
            }
        }

        return commands;
    }

    /**
     * Execute plugin hooks: onBeforeMessage
     */
    async executeBeforeMessageHooks(
        message: string,
        context: Omit<PluginContext, 'settings'>
    ): Promise<{ message: string; shouldContinue: boolean; directResponse?: string }> {
        let currentMessage = message;
        let shouldContinue = true;
        let directResponse: string | undefined;

        for (const plugin of this.getEnabledPlugins()) {
            if (plugin.hooks.onBeforeMessage) {
                const state = this.pluginStates.get(plugin.metadata.id);
                if (!state) continue;

                try {
                    const result = await plugin.hooks.onBeforeMessage(currentMessage, {
                        ...context,
                        settings: state.settings,
                    });

                    currentMessage = result.message;
                    if (!result.shouldContinue) {
                        shouldContinue = false;
                        directResponse = result.directResponse;
                        break;
                    }
                } catch (error) {
                    console.error(`Plugin ${plugin.metadata.id} onBeforeMessage error:`, error);
                }
            }
        }

        return { message: currentMessage, shouldContinue, directResponse };
    }

    /**
     * Execute plugin hooks: onAfterResponse
     */
    async executeAfterResponseHooks(
        response: string,
        context: Omit<PluginContext, 'settings'>
    ): Promise<{ response: string; additions: string[] }> {
        let currentResponse = response;
        const additions: string[] = [];

        for (const plugin of this.getEnabledPlugins()) {
            if (plugin.hooks.onAfterResponse) {
                const state = this.pluginStates.get(plugin.metadata.id);
                if (!state) continue;

                try {
                    const result = await plugin.hooks.onAfterResponse(currentResponse, {
                        ...context,
                        settings: state.settings,
                    });

                    currentResponse = result.response;
                    if (result.additions) {
                        additions.push(...result.additions);
                    }
                } catch (error) {
                    console.error(`Plugin ${plugin.metadata.id} onAfterResponse error:`, error);
                }
            }
        }

        return { response: currentResponse, additions };
    }

    /**
     * Execute a slash command
     */
    async executeCommand(
        commandName: string,
        args: string,
        context: Omit<PluginContext, 'settings'>
    ): Promise<PluginCommandResult | null> {
        for (const plugin of this.getEnabledPlugins()) {
            if (!plugin.commands) continue;

            const command = plugin.commands.find(c => c.command === commandName);
            if (command) {
                const state = this.pluginStates.get(plugin.metadata.id);
                if (!state) continue;

                try {
                    state.lastUsed = Date.now();
                    this.saveStates();

                    return await command.handler(args, {
                        ...context,
                        settings: state.settings,
                    });
                } catch (error) {
                    console.error(`Command ${commandName} error:`, error);
                    return {
                        success: false,
                        error: (error as Error).message,
                    };
                }
            }
        }

        return null;
    }

    /**
     * Save plugin states to localStorage
     */
    private saveStates(): void {
        try {
            const states = Array.from(this.pluginStates.entries());
            localStorage.setItem(PLUGINS_STORAGE_KEY, JSON.stringify(states));
        } catch (e) {
            console.warn('Failed to save plugin states:', e);
        }
    }

    /**
     * Load plugin states from localStorage
     */
    private loadStates(): void {
        try {
            const stored = localStorage.getItem(PLUGINS_STORAGE_KEY);
            if (stored) {
                const states: [string, PluginState][] = JSON.parse(stored);
                this.pluginStates = new Map(states);
                console.log(`📥 Loaded ${this.pluginStates.size} plugin states`);
            }
        } catch (e) {
            console.warn('Failed to load plugin states:', e);
        }
    }

    /**
     * Initialize all enabled plugins
     */
    async initializeEnabledPlugins(): Promise<void> {
        if (this.initialized) return;

        for (const [pluginId, state] of this.pluginStates.entries()) {
            if (state.enabled) {
                const plugin = this.plugins.get(pluginId);
                if (plugin?.hooks.onInit) {
                    try {
                        await plugin.hooks.onInit({ settings: state.settings });
                    } catch (error) {
                        console.error(`Failed to initialize plugin ${pluginId}:`, error);
                        state.enabled = false;
                    }
                }
            }
        }

        this.initialized = true;
        this.saveStates();
    }
}

// Singleton instance
export const pluginManager = new PluginManager();

// ==================== HELPER FUNCTIONS ====================

/**
 * Create a plugin with type safety
 */
export function definePlugin(plugin: Plugin): Plugin {
    return plugin;
}

/**
 * Check if a message is a plugin command
 */
export function isPluginCommand(message: string): { command: string; args: string } | null {
    const match = message.trim().match(/^\/(\w+)(?:\s+(.*))?$/);
    if (match) {
        return {
            command: match[1],
            args: match[2] || '',
        };
    }
    return null;
}
