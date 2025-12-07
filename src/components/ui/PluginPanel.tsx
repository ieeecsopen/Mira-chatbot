/**
 * Plugin Panel Component for MIRA
 * UI for managing, enabling, and configuring plugins
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X,
    Search,
    Power,
    Settings,
    ChevronRight,
    Code2,
    Languages,
    CloudSun,
    Calculator,
    StickyNote,
    Palette,
    Puzzle,
    Check,
    AlertCircle,
} from 'lucide-react';
import { pluginManager, type Plugin, type PluginState } from '../../lib/plugins';
import { registerBuiltInPlugins, builtInPlugins } from '../../lib/builtInPlugins';

interface PluginPanelProps {
    isOpen: boolean;
    onClose: () => void;
}

// Map icon names to Lucide components
const iconMap: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
    Palette,
    Code2,
    Languages,
    CloudSun,
    Calculator,
    StickyNote,
    Puzzle,
};

export function PluginPanel({ isOpen, onClose }: PluginPanelProps) {
    const [plugins, setPlugins] = useState<Plugin[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedPlugin, setSelectedPlugin] = useState<Plugin | null>(null);
    const [pluginStates, setPluginStates] = useState<Map<string, PluginState>>(new Map());

    // Initialize plugins on mount
    useEffect(() => {
        // Register built-in plugins
        registerBuiltInPlugins(pluginManager);

        // Load plugins
        refreshPlugins();
    }, []);

    const refreshPlugins = () => {
        setPlugins(pluginManager.getPlugins());

        // Get states for all plugins
        const states = new Map<string, PluginState>();
        for (const plugin of pluginManager.getPlugins()) {
            const state = pluginManager.getPluginState(plugin.metadata.id);
            if (state) {
                states.set(plugin.metadata.id, state);
            }
        }
        setPluginStates(states);
    };

    const handleTogglePlugin = async (plugin: Plugin) => {
        const state = pluginStates.get(plugin.metadata.id);
        if (state?.enabled) {
            await pluginManager.disablePlugin(plugin.metadata.id);
        } else {
            await pluginManager.enablePlugin(plugin.metadata.id);
        }
        refreshPlugins();
    };

    const handleSaveSettings = (pluginId: string, settings: Record<string, unknown>) => {
        pluginManager.updateSettings(pluginId, settings as Record<string, string | number | boolean>);
        refreshPlugins();
        setSelectedPlugin(null);
    };

    // Filter plugins by search
    const filteredPlugins = plugins.filter(plugin => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return (
            plugin.metadata.name.toLowerCase().includes(query) ||
            plugin.metadata.description.toLowerCase().includes(query) ||
            plugin.metadata.keywords.some(k => k.toLowerCase().includes(query))
        );
    });

    // Group by category
    const groupedPlugins = filteredPlugins.reduce((acc, plugin) => {
        const category = plugin.metadata.category;
        if (!acc[category]) acc[category] = [];
        acc[category].push(plugin);
        return acc;
    }, {} as Record<string, Plugin[]>);

    const categoryLabels: Record<string, string> = {
        productivity: '📋 Productivity',
        design: '🎨 Design',
        development: '💻 Development',
        communication: '💬 Communication',
        utilities: '🔧 Utilities',
        entertainment: '🎮 Entertainment',
        education: '📚 Education',
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.95, opacity: 0 }}
                        onClick={(e) => e.stopPropagation()}
                        className="relative w-full max-w-4xl max-h-[85vh] bg-[#0d1117] rounded-2xl
              border border-white/10 shadow-2xl overflow-hidden flex"
                    >
                        {/* Main Panel */}
                        <div className={`flex-1 flex flex-col ${selectedPlugin ? 'hidden md:flex' : ''}`}>
                            {/* Header */}
                            <div className="flex items-center justify-between p-4 border-b border-white/10">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                                        <Puzzle className="text-purple-400" size={20} />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-semibold text-white">Plugins</h2>
                                        <p className="text-xs text-gray-400">Extend MIRA with custom capabilities</p>
                                    </div>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="w-8 h-8 flex items-center justify-center rounded-lg
                    hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            {/* Search */}
                            <div className="p-4">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                    <input
                                        type="text"
                                        placeholder="Search plugins..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl
                      text-white placeholder-gray-500 text-sm
                      focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30"
                                    />
                                </div>
                            </div>

                            {/* Plugin List */}
                            <div className="flex-1 overflow-y-auto p-4 pt-0 space-y-6">
                                {Object.entries(groupedPlugins).map(([category, categoryPlugins]) => (
                                    <div key={category}>
                                        <h3 className="text-sm font-medium text-gray-400 mb-3">
                                            {categoryLabels[category] || category}
                                        </h3>
                                        <div className="space-y-2">
                                            {categoryPlugins.map((plugin) => {
                                                const state = pluginStates.get(plugin.metadata.id);
                                                const IconComponent = iconMap[plugin.metadata.icon] || Puzzle;

                                                return (
                                                    <motion.div
                                                        key={plugin.metadata.id}
                                                        whileHover={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
                                                        className="p-3 rounded-xl border border-white/5 cursor-pointer"
                                                        onClick={() => setSelectedPlugin(plugin)}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center
                                ${state?.enabled ? 'bg-purple-500/20' : 'bg-white/5'}`}>
                                                                <IconComponent
                                                                    size={20}
                                                                    className={state?.enabled ? 'text-purple-400' : 'text-gray-400'}
                                                                />
                                                            </div>

                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="font-medium text-white text-sm">
                                                                        {plugin.metadata.name}
                                                                    </span>
                                                                    {state?.enabled && (
                                                                        <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-green-500/20 text-green-400">
                                                                            Active
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <p className="text-xs text-gray-400 truncate">
                                                                    {plugin.metadata.description}
                                                                </p>
                                                            </div>

                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleTogglePlugin(plugin);
                                                                }}
                                                                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors
                                  ${state?.enabled
                                                                        ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                                                                        : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
                                                            >
                                                                <Power size={14} />
                                                            </button>

                                                            <ChevronRight size={16} className="text-gray-500" />
                                                        </div>
                                                    </motion.div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}

                                {filteredPlugins.length === 0 && (
                                    <div className="text-center py-12">
                                        <Puzzle size={40} className="mx-auto text-gray-600 mb-3" />
                                        <p className="text-gray-400">No plugins found</p>
                                    </div>
                                )}
                            </div>

                            {/* Footer */}
                            <div className="p-4 border-t border-white/10 bg-white/5">
                                <div className="flex items-center justify-between text-xs text-gray-500">
                                    <span>{plugins.length} plugins available</span>
                                    <span>{pluginManager.getEnabledPlugins().length} enabled</span>
                                </div>
                            </div>
                        </div>

                        {/* Plugin Detail Panel */}
                        <AnimatePresence>
                            {selectedPlugin && (
                                <motion.div
                                    initial={{ x: 300, opacity: 0 }}
                                    animate={{ x: 0, opacity: 1 }}
                                    exit={{ x: 300, opacity: 0 }}
                                    className="w-full md:w-80 border-l border-white/10 flex flex-col bg-[#0a0a0a]"
                                >
                                    <PluginDetail
                                        plugin={selectedPlugin}
                                        state={pluginStates.get(selectedPlugin.metadata.id)}
                                        onClose={() => setSelectedPlugin(null)}
                                        onToggle={() => handleTogglePlugin(selectedPlugin)}
                                        onSaveSettings={(settings) => handleSaveSettings(selectedPlugin.metadata.id, settings)}
                                    />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

// Plugin Detail Component
interface PluginDetailProps {
    plugin: Plugin;
    state?: PluginState;
    onClose: () => void;
    onToggle: () => void;
    onSaveSettings: (settings: Record<string, unknown>) => void;
}

function PluginDetail({ plugin, state, onClose, onToggle, onSaveSettings }: PluginDetailProps) {
    const [settings, setSettings] = useState<Record<string, unknown>>(state?.settings || plugin.settings.defaults);
    const [showSaved, setShowSaved] = useState(false);

    const IconComponent = iconMap[plugin.metadata.icon] || Puzzle;

    const handleSave = () => {
        onSaveSettings(settings);
        setShowSaved(true);
        setTimeout(() => setShowSaved(false), 2000);
    };

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="p-4 border-b border-white/10">
                <div className="flex items-center justify-between mb-4">
                    <button
                        onClick={onClose}
                        className="md:hidden w-8 h-8 flex items-center justify-center rounded-lg
              hover:bg-white/10 text-gray-400"
                    >
                        <ChevronRight size={18} className="rotate-180" />
                    </button>
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">v{plugin.metadata.version}</span>
                        <button
                            onClick={onToggle}
                            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors
                ${state?.enabled
                                    ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                                    : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'}`}
                        >
                            {state?.enabled ? 'Disable' : 'Enable'}
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center
            ${state?.enabled ? 'bg-purple-500/20' : 'bg-white/5'}`}>
                        <IconComponent size={24} className={state?.enabled ? 'text-purple-400' : 'text-gray-400'} />
                    </div>
                    <div>
                        <h3 className="font-semibold text-white">{plugin.metadata.name}</h3>
                        <p className="text-xs text-gray-400">by {plugin.metadata.author}</p>
                    </div>
                </div>
            </div>

            {/* Description */}
            <div className="p-4 border-b border-white/10">
                <p className="text-sm text-gray-300">{plugin.metadata.description}</p>

                {plugin.commands && plugin.commands.length > 0 && (
                    <div className="mt-4">
                        <h4 className="text-xs font-medium text-gray-400 mb-2">Commands</h4>
                        <div className="space-y-1">
                            {plugin.commands.map((cmd) => (
                                <div key={cmd.command} className="text-xs">
                                    <code className="text-purple-400">/{cmd.command}</code>
                                    <span className="text-gray-500 ml-2">- {cmd.description}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Settings */}
            {plugin.settings.schema.length > 0 && (
                <div className="flex-1 overflow-y-auto p-4">
                    <div className="flex items-center gap-2 mb-4">
                        <Settings size={14} className="text-gray-400" />
                        <h4 className="text-sm font-medium text-white">Settings</h4>
                    </div>

                    <div className="space-y-4">
                        {plugin.settings.schema.map((setting) => (
                            <div key={setting.key}>
                                <label className="block text-xs font-medium text-gray-300 mb-1.5">
                                    {setting.label}
                                    {setting.required && <span className="text-red-400 ml-1">*</span>}
                                </label>

                                {setting.type === 'boolean' ? (
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={settings[setting.key] as boolean || false}
                                            onChange={(e) => setSettings({ ...settings, [setting.key]: e.target.checked })}
                                            className="w-4 h-4 rounded border-gray-600 bg-white/5 text-purple-500
                        focus:ring-purple-500 focus:ring-offset-0"
                                        />
                                        <span className="text-xs text-gray-400">{setting.description}</span>
                                    </label>
                                ) : setting.type === 'select' ? (
                                    <select
                                        value={settings[setting.key] as string || ''}
                                        onChange={(e) => setSettings({ ...settings, [setting.key]: e.target.value })}
                                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg
                      text-white text-sm focus:outline-none focus:border-purple-500/50"
                                    >
                                        {setting.options?.map((opt) => (
                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                    </select>
                                ) : (
                                    <input
                                        type={setting.type === 'password' ? 'password' : setting.type === 'number' ? 'number' : 'text'}
                                        value={settings[setting.key] as string || ''}
                                        onChange={(e) => setSettings({ ...settings, [setting.key]: e.target.value })}
                                        placeholder={setting.description}
                                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg
                      text-white text-sm placeholder-gray-500
                      focus:outline-none focus:border-purple-500/50"
                                    />
                                )}

                                {setting.description && setting.type !== 'boolean' && (
                                    <p className="text-[10px] text-gray-500 mt-1">{setting.description}</p>
                                )}
                            </div>
                        ))}
                    </div>

                    <button
                        onClick={handleSave}
                        className="w-full mt-4 py-2 px-4 bg-purple-500 hover:bg-purple-600
              text-white text-sm font-medium rounded-lg transition-colors
              flex items-center justify-center gap-2"
                    >
                        {showSaved ? (
                            <>
                                <Check size={16} />
                                Saved!
                            </>
                        ) : (
                            'Save Settings'
                        )}
                    </button>
                </div>
            )}

            {/* Capabilities */}
            <div className="p-4 border-t border-white/10 bg-white/5">
                <h4 className="text-xs font-medium text-gray-400 mb-2">Capabilities</h4>
                <div className="flex flex-wrap gap-1">
                    {plugin.metadata.capabilities.canProcessMessages && (
                        <span className="px-2 py-0.5 text-[10px] rounded-full bg-blue-500/20 text-blue-400">
                            Process Messages
                        </span>
                    )}
                    {plugin.metadata.capabilities.canModifyResponses && (
                        <span className="px-2 py-0.5 text-[10px] rounded-full bg-green-500/20 text-green-400">
                            Modify Responses
                        </span>
                    )}
                    {plugin.metadata.capabilities.canAddSlashCommands && (
                        <span className="px-2 py-0.5 text-[10px] rounded-full bg-purple-500/20 text-purple-400">
                            Slash Commands
                        </span>
                    )}
                    {plugin.metadata.capabilities.requiresApiKey && (
                        <span className="px-2 py-0.5 text-[10px] rounded-full bg-amber-500/20 text-amber-400">
                            Requires API Key
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}
