/**
 * Plugin Panel Component for MIRA
 * Minimalist UI for managing and configuring plugins
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
} from 'lucide-react';
import { pluginManager, type Plugin, type PluginState } from '../../lib/plugins';
import { Button } from './button';
import { Input } from './input';
import { cn } from '../../lib/utils';

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

// Category labels without emojis
const categoryLabels: Record<string, string> = {
    productivity: 'Productivity',
    design: 'Design',
    development: 'Development',
    communication: 'Communication',
    utilities: 'Utilities',
    entertainment: 'Entertainment',
    education: 'Education',
};

export function PluginPanel({ isOpen, onClose }: PluginPanelProps) {
    const [plugins, setPlugins] = useState<Plugin[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedPlugin, setSelectedPlugin] = useState<Plugin | null>(null);
    const [pluginStates, setPluginStates] = useState<Map<string, PluginState>>(new Map());

    useEffect(() => {
        // Register built-in plugins on mount
        import('../../lib/builtInPlugins').then((module) => {
            module.registerBuiltInPlugins(pluginManager);
            refreshPlugins();
        });
    }, []);

    const refreshPlugins = () => {
        setPlugins(pluginManager.getPlugins());
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

    const filteredPlugins = plugins.filter(plugin => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return (
            plugin.metadata.name.toLowerCase().includes(query) ||
            plugin.metadata.description.toLowerCase().includes(query) ||
            plugin.metadata.keywords.some(k => k.toLowerCase().includes(query))
        );
    });

    const groupedPlugins = filteredPlugins.reduce((acc, plugin) => {
        const category = plugin.metadata.category;
        if (!acc[category]) acc[category] = [];
        acc[category].push(plugin);
        return acc;
    }, {} as Record<string, Plugin[]>);

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ scale: 0.96, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.96, opacity: 0 }}
                        onClick={(e) => e.stopPropagation()}
                        className="relative w-full max-w-3xl max-h-[80vh] bg-[#0d1117] rounded-xl border border-[#30363d] shadow-xl overflow-hidden flex"
                    >
                        {/* Main Panel */}
                        <div className={cn("flex-1 flex flex-col", selectedPlugin && "hidden md:flex")}>
                            {/* Header */}
                            <div className="flex items-center justify-between px-5 py-4 border-b border-[#30363d]">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-lg bg-orange-500/10 flex items-center justify-center">
                                        <Puzzle className="text-orange-400" size={18} />
                                    </div>
                                    <div>
                                        <h2 className="text-base font-medium text-white">Plugins</h2>
                                        <p className="text-xs text-[#8b949e]">Extend MIRA capabilities</p>
                                    </div>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={onClose}
                                    className="text-[#8b949e] hover:text-white hover:bg-white/5"
                                >
                                    <X size={18} />
                                </Button>
                            </div>

                            {/* Search */}
                            <div className="px-5 py-3 border-b border-[#30363d]/50">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8b949e]" size={14} />
                                    <Input
                                        type="text"
                                        placeholder="Search plugins..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="pl-9 h-9 bg-[#161b22] border-[#30363d] text-white placeholder:text-[#8b949e] text-sm focus-visible:ring-orange-500/30 focus-visible:border-orange-500/50"
                                    />
                                </div>
                            </div>

                            {/* Plugin List */}
                            <div className="flex-1 overflow-y-auto p-5 space-y-5">
                                {Object.entries(groupedPlugins).map(([category, categoryPlugins]) => (
                                    <div key={category}>
                                        <h3 className="text-xs font-medium text-[#8b949e] uppercase tracking-wider mb-2">
                                            {categoryLabels[category] || category}
                                        </h3>
                                        <div className="space-y-1.5">
                                            {categoryPlugins.map((plugin) => {
                                                const state = pluginStates.get(plugin.metadata.id);
                                                const IconComponent = iconMap[plugin.metadata.icon] || Puzzle;
                                                const isEnabled = state?.enabled;

                                                return (
                                                    <div
                                                        key={plugin.metadata.id}
                                                        onClick={() => setSelectedPlugin(plugin)}
                                                        className={cn(
                                                            "flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors",
                                                            "border border-transparent hover:border-[#30363d] hover:bg-[#161b22]"
                                                        )}
                                                    >
                                                        <div className={cn(
                                                            "w-9 h-9 rounded-lg flex items-center justify-center shrink-0",
                                                            isEnabled ? "bg-orange-500/10" : "bg-[#21262d]"
                                                        )}>
                                                            <IconComponent
                                                                size={18}
                                                                className={isEnabled ? "text-orange-400" : "text-[#8b949e]"}
                                                            />
                                                        </div>

                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-sm font-medium text-white">
                                                                    {plugin.metadata.name}
                                                                </span>
                                                                {isEnabled && (
                                                                    <span className="px-1.5 py-0.5 text-[10px] rounded bg-orange-500/10 text-orange-400">
                                                                        Active
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <p className="text-xs text-[#8b949e] truncate">
                                                                {plugin.metadata.description}
                                                            </p>
                                                        </div>

                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleTogglePlugin(plugin);
                                                            }}
                                                            className={cn(
                                                                "h-8 w-8 shrink-0",
                                                                isEnabled
                                                                    ? "text-orange-400 hover:text-orange-300 hover:bg-orange-500/10"
                                                                    : "text-[#8b949e] hover:text-white hover:bg-white/5"
                                                            )}
                                                        >
                                                            <Power size={14} />
                                                        </Button>

                                                        <ChevronRight size={14} className="text-[#484f58] shrink-0" />
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}

                                {filteredPlugins.length === 0 && (
                                    <div className="flex flex-col items-center justify-center py-12 text-center">
                                        <Puzzle size={32} className="text-[#484f58] mb-3" />
                                        <p className="text-sm text-[#8b949e]">No plugins found</p>
                                    </div>
                                )}
                            </div>

                            {/* Footer */}
                            <div className="px-5 py-3 border-t border-[#30363d] bg-[#161b22]/50">
                                <div className="flex items-center justify-between text-xs text-[#8b949e]">
                                    <span>{plugins.length} plugins</span>
                                    <span>{pluginManager.getEnabledPlugins().length} enabled</span>
                                </div>
                            </div>
                        </div>

                        {/* Plugin Detail Panel */}
                        <AnimatePresence>
                            {selectedPlugin && (
                                <motion.div
                                    initial={{ x: 100, opacity: 0 }}
                                    animate={{ x: 0, opacity: 1 }}
                                    exit={{ x: 100, opacity: 0 }}
                                    transition={{ type: "spring", damping: 25, stiffness: 300 }}
                                    className="w-full md:w-80 border-l border-[#30363d] flex flex-col bg-[#0d1117] overflow-hidden"
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
    const isEnabled = state?.enabled;

    const handleSave = () => {
        onSaveSettings(settings);
        setShowSaved(true);
        setTimeout(() => setShowSaved(false), 2000);
    };

    return (
        <div className="flex flex-col h-full overflow-hidden">
            {/* Header - shrink-0 prevents compression */}
            <div className="shrink-0 px-4 py-3 border-b border-[#30363d]">
                <div className="flex items-center justify-between mb-3">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onClose}
                        className="md:hidden h-7 px-2 text-[#8b949e] hover:text-white"
                    >
                        <ChevronRight size={14} className="rotate-180 mr-1" />
                        Back
                    </Button>
                    <div className="flex items-center gap-2 ml-auto">
                        <span className="text-[10px] text-[#8b949e]">v{plugin.metadata.version}</span>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onToggle}
                            className={cn(
                                "h-7 px-2.5 text-xs",
                                isEnabled
                                    ? "text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                    : "text-orange-400 hover:text-orange-300 hover:bg-orange-500/10"
                            )}
                        >
                            {isEnabled ? 'Disable' : 'Enable'}
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={onClose}
                            className="hidden md:flex h-7 w-7 text-[#8b949e] hover:text-white"
                        >
                            <X size={14} />
                        </Button>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center",
                        isEnabled ? "bg-orange-500/10" : "bg-[#21262d]"
                    )}>
                        <IconComponent size={20} className={isEnabled ? "text-orange-400" : "text-[#8b949e]"} />
                    </div>
                    <div>
                        <h3 className="text-sm font-medium text-white">{plugin.metadata.name}</h3>
                        <p className="text-[10px] text-[#8b949e]">by {plugin.metadata.author}</p>
                    </div>
                </div>
            </div>

            {/* Description */}
            <div className="px-4 py-3 border-b border-[#30363d]">
                <p className="text-xs text-[#8b949e] leading-relaxed">{plugin.metadata.description}</p>

                {plugin.commands && plugin.commands.length > 0 && (
                    <div className="mt-3">
                        <h4 className="text-[10px] font-medium text-[#8b949e] uppercase tracking-wider mb-1.5">Commands</h4>
                        <div className="space-y-1">
                            {plugin.commands.map((cmd) => (
                                <div key={cmd.command} className="text-xs">
                                    <code className="text-orange-400">/{cmd.command}</code>
                                    <span className="text-[#8b949e] ml-1.5">- {cmd.description}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Settings */}
            {plugin.settings.schema.length > 0 && (
                <div className="flex-1 overflow-y-auto px-4 py-3">
                    <div className="flex items-center gap-1.5 mb-3">
                        <Settings size={12} className="text-[#8b949e]" />
                        <h4 className="text-xs font-medium text-white">Settings</h4>
                    </div>

                    <div className="space-y-3">
                        {plugin.settings.schema.map((setting) => (
                            <div key={setting.key}>
                                <label className="block text-[10px] font-medium text-[#8b949e] uppercase tracking-wider mb-1">
                                    {setting.label}
                                    {setting.required && <span className="text-orange-400 ml-0.5">*</span>}
                                </label>

                                {setting.type === 'boolean' ? (
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={settings[setting.key] as boolean || false}
                                            onChange={(e) => setSettings({ ...settings, [setting.key]: e.target.checked })}
                                            className="w-3.5 h-3.5 rounded border-[#30363d] bg-[#21262d] text-orange-500 focus:ring-orange-500/30 focus:ring-offset-0"
                                        />
                                        <span className="text-[10px] text-[#8b949e]">{setting.description}</span>
                                    </label>
                                ) : setting.type === 'select' ? (
                                    <select
                                        value={settings[setting.key] as string || ''}
                                        onChange={(e) => setSettings({ ...settings, [setting.key]: e.target.value })}
                                        className="w-full h-8 px-2 bg-[#21262d] border border-[#30363d] rounded-md text-white text-xs focus:outline-none focus:border-orange-500/50"
                                    >
                                        {setting.options?.map((opt) => (
                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                    </select>
                                ) : (
                                    <Input
                                        type={setting.type === 'password' ? 'password' : setting.type === 'number' ? 'number' : 'text'}
                                        value={settings[setting.key] as string || ''}
                                        onChange={(e) => setSettings({ ...settings, [setting.key]: e.target.value })}
                                        placeholder={setting.description}
                                        className="h-8 bg-[#21262d] border-[#30363d] text-white text-xs placeholder:text-[#8b949e] focus-visible:ring-orange-500/30 focus-visible:border-orange-500/50"
                                    />
                                )}

                                {setting.description && setting.type !== 'boolean' && (
                                    <p className="text-[10px] text-[#484f58] mt-0.5">{setting.description}</p>
                                )}
                            </div>
                        ))}
                    </div>

                    <Button
                        onClick={handleSave}
                        className="w-full mt-4 h-8 bg-orange-500 hover:bg-orange-600 text-white text-xs font-medium"
                    >
                        {showSaved ? (
                            <>
                                <Check size={14} />
                                Saved
                            </>
                        ) : (
                            'Save Settings'
                        )}
                    </Button>
                </div>
            )}

            {/* Capabilities */}
            <div className="px-4 py-3 border-t border-[#30363d] bg-[#161b22]/50">
                <h4 className="text-[10px] font-medium text-[#8b949e] uppercase tracking-wider mb-2">Capabilities</h4>
                <div className="flex flex-wrap gap-1">
                    {plugin.metadata.capabilities.canProcessMessages && (
                        <span className="px-1.5 py-0.5 text-[10px] rounded bg-orange-500/10 text-orange-400">
                            Process Messages
                        </span>
                    )}
                    {plugin.metadata.capabilities.canModifyResponses && (
                        <span className="px-1.5 py-0.5 text-[10px] rounded bg-orange-500/10 text-orange-400">
                            Modify Responses
                        </span>
                    )}
                    {plugin.metadata.capabilities.canAddSlashCommands && (
                        <span className="px-1.5 py-0.5 text-[10px] rounded bg-orange-500/10 text-orange-400">
                            Slash Commands
                        </span>
                    )}
                    {plugin.metadata.capabilities.requiresApiKey && (
                        <span className="px-1.5 py-0.5 text-[10px] rounded bg-[#21262d] text-[#8b949e]">
                            Requires API Key
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}
