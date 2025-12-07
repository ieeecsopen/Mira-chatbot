/**
 * Built-in Plugins for MIRA
 * Collection of pre-built plugins for common functionality
 */

import { definePlugin, type Plugin, type PluginCommandResult } from './plugins';

// ==================== CANVA DESIGN PLUGIN ====================

export const canvaPlugin: Plugin = definePlugin({
    metadata: {
        id: 'canva-design',
        name: 'Canva Design',
        description: 'Create beautiful designs, social media graphics, and presentations with Canva integration',
        version: '1.0.0',
        author: 'MIRA Team',
        icon: 'Palette',
        category: 'design',
        keywords: ['design', 'graphics', 'canva', 'social media', 'presentation'],
        website: 'https://canva.com',
        capabilities: {
            canAddSlashCommands: true,
            canGenerateContent: true,
            requiresApiKey: true,
        },
    },
    settings: {
        schema: [
            {
                key: 'canvaApiKey',
                label: 'Canva API Key',
                type: 'password',
                description: 'Your Canva API key for design generation',
                required: true,
            },
            {
                key: 'defaultTemplate',
                label: 'Default Template',
                type: 'select',
                description: 'Default design template',
                options: [
                    { value: 'social-post', label: 'Social Media Post' },
                    { value: 'presentation', label: 'Presentation' },
                    { value: 'poster', label: 'Poster' },
                    { value: 'logo', label: 'Logo' },
                    { value: 'flyer', label: 'Flyer' },
                ],
            },
        ],
        defaults: {
            canvaApiKey: '',
            defaultTemplate: 'social-post',
        },
    },
    hooks: {
        async onInit() {
            console.log('🎨 Canva plugin initialized');
        },
    },
    commands: [
        {
            command: 'design',
            description: 'Create a design with Canva',
            usage: '/design <description> - e.g., /design Modern tech startup logo',
            handler: async (args, context): Promise<PluginCommandResult> => {
                if (!args.trim()) {
                    return {
                        success: false,
                        error: 'Please provide a design description. Usage: /design <description>',
                    };
                }

                if (!context.settings.canvaApiKey) {
                    return {
                        success: false,
                        error: 'Canva API key not configured. Please set it in plugin settings.',
                    };
                }

                // Simulate Canva API integration
                // In production, this would call the actual Canva API
                const template = context.settings.defaultTemplate as string;

                return {
                    success: true,
                    content: `🎨 **Canva Design Request**\n\n**Description:** ${args}\n**Template:** ${template}\n\n_Creating your design... This would integrate with Canva's API to generate a design link._\n\n> 💡 To use this plugin with real Canva integration, configure your Canva API key in the plugin settings.`,
                    shouldContinue: false,
                    metadata: {
                        template,
                        description: args,
                    },
                };
            },
        },
        {
            command: 'template',
            description: 'Browse Canva templates',
            usage: '/template <category>',
            handler: async (args): Promise<PluginCommandResult> => {
                const categories = ['social-media', 'presentation', 'marketing', 'education', 'business'];
                const category = args.trim().toLowerCase() || 'all';

                return {
                    success: true,
                    content: `📁 **Canva Templates**\n\n**Category:** ${category}\n\n**Available Categories:**\n${categories.map(c => `• ${c}`).join('\n')}\n\n_Browse templates at [canva.com/templates](https://canva.com/templates)_`,
                    shouldContinue: false,
                };
            },
        },
    ],
});

// ==================== CODE FORMATTER PLUGIN ====================

export const codeFormatterPlugin: Plugin = definePlugin({
    metadata: {
        id: 'code-formatter',
        name: 'Code Formatter',
        description: 'Format and beautify code in multiple programming languages',
        version: '1.0.0',
        author: 'MIRA Team',
        icon: 'Code2',
        category: 'development',
        keywords: ['code', 'format', 'beautify', 'prettier', 'lint'],
        capabilities: {
            canProcessMessages: true,
            canModifyResponses: true,
            canAddSlashCommands: true,
        },
    },
    settings: {
        schema: [
            {
                key: 'autoFormat',
                label: 'Auto Format',
                type: 'boolean',
                description: 'Automatically format code blocks in responses',
            },
            {
                key: 'indentSize',
                label: 'Indent Size',
                type: 'select',
                options: [
                    { value: '2', label: '2 spaces' },
                    { value: '4', label: '4 spaces' },
                    { value: 'tab', label: 'Tabs' },
                ],
            },
        ],
        defaults: {
            autoFormat: true,
            indentSize: '2',
        },
    },
    hooks: {
        async onAfterResponse(response, context) {
            if (!context.settings.autoFormat) {
                return { response };
            }

            // Auto-format code blocks in response
            const formattedResponse = response.replace(
                /```(\w+)?\n([\s\S]*?)```/g,
                (_match, lang, code) => {
                    const formatted = formatCode(code, lang, context.settings.indentSize as string);
                    return `\`\`\`${lang || ''}\n${formatted}\`\`\``;
                }
            );

            return { response: formattedResponse };
        },
    },
    commands: [
        {
            command: 'format',
            description: 'Format code snippet',
            usage: '/format <language> <code>',
            handler: async (args, context): Promise<PluginCommandResult> => {
                const match = args.match(/^(\w+)\s+([\s\S]+)$/);

                if (!match) {
                    return {
                        success: false,
                        error: 'Usage: /format <language> <code>\nExample: /format javascript const x=1',
                    };
                }

                const [, language, code] = match;
                const formatted = formatCode(code, language, context.settings.indentSize as string);

                return {
                    success: true,
                    content: `✨ **Formatted ${language.toUpperCase()} Code:**\n\n\`\`\`${language}\n${formatted}\`\`\``,
                    shouldContinue: false,
                };
            },
        },
        {
            command: 'minify',
            description: 'Minify code',
            usage: '/minify <code>',
            handler: async (args): Promise<PluginCommandResult> => {
                const minified = args
                    .replace(/\s+/g, ' ')
                    .replace(/\s*([{};,:])\s*/g, '$1')
                    .trim();

                return {
                    success: true,
                    content: `📦 **Minified Code:**\n\n\`\`\`\n${minified}\n\`\`\``,
                    shouldContinue: false,
                };
            },
        },
    ],
});

// Helper function for code formatting
function formatCode(code: string, language?: string, indentSize: string = '2'): string {
    const indent = indentSize === 'tab' ? '\t' : ' '.repeat(parseInt(indentSize));
    let formatted = code.trim();

    // Basic formatting for common languages
    if (['javascript', 'typescript', 'json', 'css'].includes(language?.toLowerCase() || '')) {
        // Add newlines after { and before }
        formatted = formatted.replace(/\{/g, '{\n');
        formatted = formatted.replace(/\}/g, '\n}');
        formatted = formatted.replace(/;/g, ';\n');

        // Indent based on depth
        const lines = formatted.split('\n').filter(l => l.trim());
        let depth = 0;
        formatted = lines.map(line => {
            const trimmed = line.trim();
            if (trimmed.startsWith('}')) depth--;
            const indented = indent.repeat(Math.max(0, depth)) + trimmed;
            if (trimmed.endsWith('{')) depth++;
            return indented;
        }).join('\n');
    }

    return formatted;
}

// ==================== TRANSLATOR PLUGIN ====================

export const translatorPlugin: Plugin = definePlugin({
    metadata: {
        id: 'translator',
        name: 'Language Translator',
        description: 'Translate text between Sinhala, English, and other languages',
        version: '1.0.0',
        author: 'MIRA Team',
        icon: 'Languages',
        category: 'communication',
        keywords: ['translate', 'language', 'sinhala', 'english', 'localization'],
        capabilities: {
            canProcessMessages: true,
            canAddSlashCommands: true,
        },
    },
    settings: {
        schema: [
            {
                key: 'defaultSourceLang',
                label: 'Default Source Language',
                type: 'select',
                options: [
                    { value: 'auto', label: 'Auto Detect' },
                    { value: 'en', label: 'English' },
                    { value: 'si', label: 'Sinhala' },
                    { value: 'ta', label: 'Tamil' },
                ],
            },
            {
                key: 'defaultTargetLang',
                label: 'Default Target Language',
                type: 'select',
                options: [
                    { value: 'si', label: 'Sinhala' },
                    { value: 'en', label: 'English' },
                    { value: 'ta', label: 'Tamil' },
                ],
            },
        ],
        defaults: {
            defaultSourceLang: 'auto',
            defaultTargetLang: 'si',
        },
    },
    hooks: {},
    commands: [
        {
            command: 'translate',
            description: 'Translate text to another language',
            usage: '/translate [lang] <text> - e.g., /translate si Hello world',
            handler: async (args, context): Promise<PluginCommandResult> => {
                if (!args.trim()) {
                    return {
                        success: false,
                        error: 'Please provide text to translate. Usage: /translate [lang] <text>',
                    };
                }

                // Parse args: check if first word is a language code
                const parts = args.split(' ');
                const langCodes = ['en', 'si', 'ta', 'zh', 'ja', 'ko', 'hi', 'fr', 'de', 'es'];

                let targetLang = context.settings.defaultTargetLang as string;
                let text = args;

                if (langCodes.includes(parts[0].toLowerCase())) {
                    targetLang = parts[0].toLowerCase();
                    text = parts.slice(1).join(' ');
                }

                const langNames: Record<string, string> = {
                    en: 'English',
                    si: 'සිංහල (Sinhala)',
                    ta: 'தமிழ் (Tamil)',
                    zh: '中文 (Chinese)',
                    ja: '日本語 (Japanese)',
                    ko: '한국어 (Korean)',
                    hi: 'हिन्दी (Hindi)',
                    fr: 'Français (French)',
                    de: 'Deutsch (German)',
                    es: 'Español (Spanish)',
                };

                return {
                    success: true,
                    content: `🌐 **Translation Request**\n\n**Original:** ${text}\n**Target Language:** ${langNames[targetLang] || targetLang}\n\n_Asking MIRA to translate..._`,
                    shouldContinue: true, // Let AI handle the actual translation
                    metadata: {
                        originalText: text,
                        targetLang,
                    },
                };
            },
        },
        {
            command: 'detect',
            description: 'Detect the language of text',
            usage: '/detect <text>',
            handler: async (args): Promise<PluginCommandResult> => {
                if (!args.trim()) {
                    return {
                        success: false,
                        error: 'Please provide text to detect. Usage: /detect <text>',
                    };
                }

                // Simple language detection heuristics
                const hasSinhala = /[\u0D80-\u0DFF]/.test(args);
                const hasTamil = /[\u0B80-\u0BFF]/.test(args);
                const hasChinese = /[\u4E00-\u9FFF]/.test(args);
                const hasJapanese = /[\u3040-\u309F\u30A0-\u30FF]/.test(args);
                const hasKorean = /[\uAC00-\uD7AF]/.test(args);

                let detected = 'English';
                if (hasSinhala) detected = 'Sinhala (සිංහල)';
                else if (hasTamil) detected = 'Tamil (தமிழ்)';
                else if (hasJapanese) detected = 'Japanese (日本語)';
                else if (hasChinese) detected = 'Chinese (中文)';
                else if (hasKorean) detected = 'Korean (한국어)';

                return {
                    success: true,
                    content: `🔍 **Language Detection**\n\n**Text:** "${args.substring(0, 50)}${args.length > 50 ? '...' : ''}"\n**Detected Language:** ${detected}`,
                    shouldContinue: false,
                };
            },
        },
    ],
});

// ==================== WEATHER PLUGIN ====================

export const weatherPlugin: Plugin = definePlugin({
    metadata: {
        id: 'weather',
        name: 'Weather Info',
        description: 'Get current weather and forecasts for any location',
        version: '1.0.0',
        author: 'MIRA Team',
        icon: 'CloudSun',
        category: 'utilities',
        keywords: ['weather', 'forecast', 'temperature', 'climate'],
        capabilities: {
            canAddSlashCommands: true,
            requiresApiKey: true,
        },
    },
    settings: {
        schema: [
            {
                key: 'weatherApiKey',
                label: 'OpenWeather API Key',
                type: 'password',
                description: 'API key from openweathermap.org',
            },
            {
                key: 'defaultCity',
                label: 'Default City',
                type: 'text',
                description: 'Your default city for weather',
            },
            {
                key: 'units',
                label: 'Temperature Units',
                type: 'select',
                options: [
                    { value: 'metric', label: 'Celsius' },
                    { value: 'imperial', label: 'Fahrenheit' },
                ],
            },
        ],
        defaults: {
            weatherApiKey: '',
            defaultCity: 'Colombo',
            units: 'metric',
        },
    },
    hooks: {},
    commands: [
        {
            command: 'weather',
            description: 'Get current weather',
            usage: '/weather [city] - e.g., /weather Colombo',
            handler: async (args, context): Promise<PluginCommandResult> => {
                const city = args.trim() || context.settings.defaultCity as string;
                const units = context.settings.units as string;
                const unitSymbol = units === 'metric' ? '°C' : '°F';

                // Simulate weather data (in production, would call OpenWeather API)
                const mockWeather = {
                    temp: units === 'metric' ? 28 : 82,
                    humidity: 75,
                    description: 'Partly Cloudy',
                    windSpeed: units === 'metric' ? 12 : 7.5,
                    windUnit: units === 'metric' ? 'km/h' : 'mph',
                };

                return {
                    success: true,
                    content: `🌤️ **Weather in ${city}**\n\n` +
                        `🌡️ Temperature: ${mockWeather.temp}${unitSymbol}\n` +
                        `💧 Humidity: ${mockWeather.humidity}%\n` +
                        `☁️ Condition: ${mockWeather.description}\n` +
                        `💨 Wind: ${mockWeather.windSpeed} ${mockWeather.windUnit}\n\n` +
                        `_Configure your OpenWeather API key for real-time data._`,
                    shouldContinue: false,
                };
            },
        },
    ],
});

// ==================== CALCULATOR PLUGIN ====================

export const calculatorPlugin: Plugin = definePlugin({
    metadata: {
        id: 'calculator',
        name: 'Calculator',
        description: 'Perform mathematical calculations and conversions',
        version: '1.0.0',
        author: 'MIRA Team',
        icon: 'Calculator',
        category: 'utilities',
        keywords: ['calculate', 'math', 'convert', 'currency'],
        capabilities: {
            canAddSlashCommands: true,
        },
    },
    settings: {
        schema: [
            {
                key: 'precision',
                label: 'Decimal Precision',
                type: 'select',
                options: [
                    { value: '2', label: '2 decimals' },
                    { value: '4', label: '4 decimals' },
                    { value: '6', label: '6 decimals' },
                ],
            },
        ],
        defaults: {
            precision: '4',
        },
    },
    hooks: {},
    commands: [
        {
            command: 'calc',
            description: 'Calculate a math expression',
            usage: '/calc <expression> - e.g., /calc 2 + 2 * 3',
            handler: async (args, context): Promise<PluginCommandResult> => {
                if (!args.trim()) {
                    return {
                        success: false,
                        error: 'Please provide a math expression. Usage: /calc <expression>',
                    };
                }

                try {
                    // Safe math expression evaluation
                    const expression = args.replace(/[^0-9+\-*/().%\s]/g, '');
                    const result = Function(`'use strict'; return (${expression})`)();
                    const precision = parseInt(context.settings.precision as string);
                    const formatted = typeof result === 'number'
                        ? parseFloat(result.toFixed(precision))
                        : result;

                    return {
                        success: true,
                        content: `🔢 **Calculator**\n\n\`${args}\` = **${formatted}**`,
                        shouldContinue: false,
                    };
                } catch {
                    return {
                        success: false,
                        error: `Invalid expression: ${args}`,
                    };
                }
            },
        },
        {
            command: 'convert',
            description: 'Convert units',
            usage: '/convert <value> <from> to <to>',
            handler: async (args): Promise<PluginCommandResult> => {
                const match = args.match(/^([\d.]+)\s*(\w+)\s+to\s+(\w+)$/i);

                if (!match) {
                    return {
                        success: false,
                        error: 'Usage: /convert <value> <from> to <to>\nExample: /convert 100 km to miles',
                    };
                }

                const [, valueStr, fromUnit, toUnit] = match;
                const value = parseFloat(valueStr);

                // Conversion factors (can be number or function)
                type ConversionValue = number | ((v: number) => number);
                const conversions: Record<string, Record<string, ConversionValue>> = {
                    km: { miles: 0.621371, m: 1000, ft: 3280.84 },
                    miles: { km: 1.60934, m: 1609.34, ft: 5280 },
                    kg: { lbs: 2.20462, g: 1000, oz: 35.274 },
                    lbs: { kg: 0.453592, g: 453.592, oz: 16 },
                    c: { f: (v: number) => (v * 9 / 5) + 32, k: (v: number) => v + 273.15 },
                    f: { c: (v: number) => (v - 32) * 5 / 9, k: (v: number) => (v - 32) * 5 / 9 + 273.15 },
                };

                const fromLower = fromUnit.toLowerCase();
                const toLower = toUnit.toLowerCase();

                const converter = conversions[fromLower]?.[toLower];
                if (converter === undefined) {
                    return {
                        success: false,
                        error: `Unknown conversion: ${fromUnit} to ${toUnit}`,
                    };
                }

                const result = typeof converter === 'function'
                    ? converter(value)
                    : value * converter;

                return {
                    success: true,
                    content: `📐 **Unit Conversion**\n\n${value} ${fromUnit} = **${result.toFixed(2)} ${toUnit}**`,
                    shouldContinue: false,
                };
            },
        },
    ],
});

// ==================== NOTES PLUGIN ====================

export const notesPlugin: Plugin = definePlugin({
    metadata: {
        id: 'notes',
        name: 'Quick Notes',
        description: 'Save and retrieve quick notes and reminders',
        version: '1.0.0',
        author: 'MIRA Team',
        icon: 'StickyNote',
        category: 'productivity',
        keywords: ['notes', 'memo', 'reminder', 'save'],
        capabilities: {
            canAddSlashCommands: true,
        },
    },
    settings: {
        schema: [],
        defaults: {},
    },
    hooks: {
        async onInit() {
            // Initialize notes storage
            if (!localStorage.getItem('mira-notes')) {
                localStorage.setItem('mira-notes', JSON.stringify([]));
            }
        },
    },
    commands: [
        {
            command: 'note',
            description: 'Save or view notes',
            usage: '/note [add|list|delete] [content]',
            handler: async (args): Promise<PluginCommandResult> => {
                const parts = args.trim().split(' ');
                const action = parts[0]?.toLowerCase() || 'list';
                const content = parts.slice(1).join(' ');

                const notesJson = localStorage.getItem('mira-notes') || '[]';
                const notes: Array<{ id: number; text: string; createdAt: string }> = JSON.parse(notesJson);

                if (action === 'add' && content) {
                    const newNote = {
                        id: Date.now(),
                        text: content,
                        createdAt: new Date().toLocaleString(),
                    };
                    notes.push(newNote);
                    localStorage.setItem('mira-notes', JSON.stringify(notes));

                    return {
                        success: true,
                        content: `📝 **Note Saved**\n\n"${content}"\n\n_Saved at ${newNote.createdAt}_`,
                        shouldContinue: false,
                    };
                }

                if (action === 'delete' && content) {
                    const index = parseInt(content) - 1;
                    if (index >= 0 && index < notes.length) {
                        const deleted = notes.splice(index, 1)[0];
                        localStorage.setItem('mira-notes', JSON.stringify(notes));
                        return {
                            success: true,
                            content: `🗑️ **Note Deleted**\n\n"${deleted.text}"`,
                            shouldContinue: false,
                        };
                    }
                    return {
                        success: false,
                        error: `Note #${content} not found`,
                    };
                }

                // List notes
                if (notes.length === 0) {
                    return {
                        success: true,
                        content: `📝 **Your Notes**\n\n_No notes yet. Use \`/note add <text>\` to create one._`,
                        shouldContinue: false,
                    };
                }

                const notesList = notes.map((n, i) => `${i + 1}. ${n.text}\n   _${n.createdAt}_`).join('\n\n');
                return {
                    success: true,
                    content: `📝 **Your Notes** (${notes.length})\n\n${notesList}\n\n_Use \`/note delete <#>\` to remove a note._`,
                    shouldContinue: false,
                };
            },
        },
    ],
});

// ==================== EXPORT ALL BUILT-IN PLUGINS ====================

export const builtInPlugins: Plugin[] = [
    canvaPlugin,
    codeFormatterPlugin,
    translatorPlugin,
    weatherPlugin,
    calculatorPlugin,
    notesPlugin,
];

/**
 * Register all built-in plugins with the plugin manager
 */
export function registerBuiltInPlugins(manager: typeof import('./plugins').pluginManager): void {
    for (const plugin of builtInPlugins) {
        manager.register(plugin);
    }
    console.log(`🔌 Registered ${builtInPlugins.length} built-in plugins`);
}
