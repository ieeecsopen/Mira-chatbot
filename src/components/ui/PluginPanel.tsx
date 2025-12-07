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
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.95, opacity: 0 }}
                        onClick={(e) => e.stopPropagation()}
                        className="relative w-full max-w-5xl max-h-[85vh] bg-[#0d1117] rounded-2xl border border-[#30363d]/50 shadow-2xl overflow-hidden flex"
                    >
                        {/* Main Panel */}
                        <div className={cn("flex-1 flex flex-col min-w-0", selectedPlugin && "hidden md:flex")}>
                            {/* Header */}
                            <div className="px-6 py-5 border-b border-[#30363d]/50">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h2 className="text-lg font-semibold text-white">Plugins</h2>
                                        <p className="text-sm text-[#8b949e] mt-0.5">Manage and configure extensions</p>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={onClose}
                                        className="h-9 w-9 text-[#8b949e] hover:text-white hover:bg-[#21262d] rounded-lg"
                                    >
                                        <X size={20} />
                                    </Button>
                                </div>

                                {/* Search */}
                                <div className="relative mt-4">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8b949e]" size={16} />
                                    <Input
                                        type="text"
                                        placeholder="Search plugins..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="pl-10 h-10 bg-[#161b22] border-[#30363d]/50 text-white placeholder:text-[#8b949e] focus-visible:ring-orange-500/20 focus-visible:border-orange-500/50 rounded-lg"
                                    />
                                </div>
                            </div>

                            {/* Stats Bar */}
                            <div className="px-6 py-3 border-b border-[#30363d]/30 bg-[#161b22]/30">
                                <div className="flex items-center gap-6 text-sm">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-[#8b949e]" />
                                        <span className="text-[#8b949e]">{plugins.length} Total</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-orange-500" />
                                        <span className="text-[#8b949e]">{pluginManager.getEnabledPlugins().length} Active</span>
                                    </div>
                                </div>
                            </div>

                            {/* Plugin List */}
                            <div className="flex-1 overflow-y-auto px-6 py-4">
                                {Object.entries(groupedPlugins).map(([category, categoryPlugins]) => (
                                    <div key={category} className="mb-6 last:mb-0">
                                        <h3 className="text-xs font-semibold text-white uppercase tracking-wider mb-3 px-1">
                                            {categoryLabels[category] || category}
                                        </h3>
                                        <div className="space-y-2">
                                            {categoryPlugins.map((plugin) => {
                                                const state = pluginStates.get(plugin.metadata.id);
                                                const IconComponent = iconMap[plugin.metadata.icon] || Puzzle;
                                                const isEnabled = state?.enabled;

                                                return (
                                                    <div
                                                        key={plugin.metadata.id}
                                                        onClick={() => setSelectedPlugin(plugin)}
                                                        className={cn(
                                                            "group relative flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-all duration-200",
                                                            "border border-[#30363d]/30 hover:border-[#30363d] hover:bg-[#161b22]/50",
                                                            isEnabled && "bg-orange-500/5 border-orange-500/20"
                                                        )}
                                                    >
                                                        <div className={cn(
                                                            "w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-colors",
                                                            isEnabled ? "bg-orange-500/10" : "bg-[#21262d]",
                                                            "group-hover:bg-orange-500/15"
                                                        )}>
                                                            <IconComponent
                                                                size={20}
                                                                className={cn(
                                                                    "transition-colors",
                                                                    isEnabled ? "text-orange-400" : "text-[#8b949e]"
                                                                )}
                                                            />
                                                        </div>

                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <span className="text-sm font-medium text-white">
                                                                    {plugin.metadata.name}
                                                                </span>
                                                                {isEnabled && (
                                                                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-orange-500/10">
                                                                        <div className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                                                                        <span className="text-[10px] font-medium text-orange-400">
                                                                            Active
                                                                        </span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <p className="text-xs text-[#8b949e] leading-relaxed line-clamp-1">
                                                                {plugin.metadata.description}
                                                            </p>
                                                        </div>

                                                        <div className="flex items-center gap-2 shrink-0">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleTogglePlugin(plugin);
                                                                }}
                                                                className={cn(
                                                                    "h-8 px-3 text-xs font-medium rounded-lg transition-all",
                                                                    isEnabled
                                                                        ? "text-orange-400 hover:text-orange-300 hover:bg-orange-500/10"
                                                                        : "text-[#8b949e] hover:text-white hover:bg-[#21262d]"
                                                                )}
                                                            >
                                                                <Power size={14} className="mr-1.5" />
                                                                {isEnabled ? 'Disable' : 'Enable'}
                                                            </Button>
                                                            <ChevronRight size={16} className="text-[#484f58]" />
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}

                                {filteredPlugins.length === 0 && (
                                    <div className="flex flex-col items-center justify-center py-16 text-center">
                                        <div className="w-16 h-16 rounded-2xl bg-[#21262d] flex items-center justify-center mb-4">
                                            <Puzzle size={32} className="text-[#484f58]" />
                                        </div>
                                        <p className="text-sm font-medium text-white mb-1">No plugins found</p>
                                        <p className="text-xs text-[#8b949e]">Try a different search term</p>
                                    </div>
                                )}
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
                                    className="w-full md:w-[520px] border-l border-[#30363d]/50 flex flex-col bg-[#0d1117] overflow-hidden"
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
            {/* Header */}
            <div className="px-6 py-5 border-b border-[#30363d]/50">
                <div className="flex items-start justify-between mb-4">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onClose}
                        className="md:hidden h-8 px-2 text-[#8b949e] hover:text-white hover:bg-[#21262d] rounded-lg -ml-2"
                    >
                        <ChevronRight size={16} className="rotate-180 mr-1" />
                        Back
                    </Button>
                    <div className="flex items-center gap-2 ml-auto">
                        <span className="text-xs text-[#8b949e] px-2 py-1 bg-[#21262d] rounded-md">
                            v{plugin.metadata.version}
                        </span>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={onClose}
                            className="hidden md:flex h-8 w-8 text-[#8b949e] hover:text-white hover:bg-[#21262d] rounded-lg"
                        >
                            <X size={16} />
                        </Button>
                    </div>
                </div>

                <div className="flex items-start gap-4">
                    <div className={cn(
                        "w-12 h-12 rounded-xl flex items-center justify-center shrink-0",
                        isEnabled ? "bg-orange-500/10" : "bg-[#21262d]"
                    )}>
                        <IconComponent size={24} className={isEnabled ? "text-orange-400" : "text-[#8b949e]"} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="text-base font-semibold text-white mb-1">{plugin.metadata.name}</h3>
                        <p className="text-xs text-[#8b949e]">by {plugin.metadata.author}</p>
                        {isEnabled && (
                            <div className="flex items-center gap-1.5 mt-2 px-2 py-1 rounded-md bg-orange-500/10 w-fit">
                                <div className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                                <span className="text-xs font-medium text-orange-400">Active</span>
                            </div>
                        )}
                    </div>
                </div>

                <Button
                    onClick={onToggle}
                    className={cn(
                        "w-full mt-4 h-9 rounded-lg font-medium text-sm transition-all",
                        isEnabled
                            ? "bg-[#21262d] text-[#8b949e] hover:bg-[#30363d] hover:text-white"
                            : "bg-orange-500 text-white hover:bg-orange-600"
                    )}
                >
                    <Power size={16} className="mr-2" />
                    {isEnabled ? 'Disable Plugin' : 'Enable Plugin'}
                </Button>
            </div>

            {/* Description */}
            <div className="px-6 py-4 border-b border-[#30363d]/30">
                <p className="text-sm text-[#8b949e] leading-relaxed">{plugin.metadata.description}</p>
            </div>

            {/* Commands */}
            {plugin.commands && plugin.commands.length > 0 && (
                <div className="px-6 py-4 border-b border-[#30363d]/30">
                    <h4 className="text-xs font-semibold text-white uppercase tracking-wider mb-3">Commands</h4>
                    <div className="space-y-2">
                        {plugin.commands.map((cmd) => (
                            <div key={cmd.command} className="p-3 bg-[#161b22] rounded-lg border border-[#30363d]/30">
                                <code className="text-xs font-mono text-orange-400">/{cmd.command}</code>
                                <p className="text-xs text-[#8b949e] mt-1">{cmd.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Settings */}
            {plugin.settings.schema.length > 0 && (
                <div className="flex-1 overflow-y-auto px-6 py-4">
                    <div className="flex items-center gap-2 mb-4">
                        <Settings size={14} className="text-[#8b949e]" />
                        <h4 className="text-xs font-semibold text-white uppercase tracking-wider">Settings</h4>
                    </div>

                    <div className="space-y-4">
                        {plugin.settings.schema.map((setting) => (
                            <div key={setting.key}>
                                <label className="block text-xs font-medium text-white mb-2">
                                    {setting.label}
                                    {setting.required && <span className="text-orange-400 ml-1">*</span>}
                                </label>

                                {setting.type === 'boolean' ? (
                                    <label className="flex items-start gap-3 p-3 bg-[#161b22] rounded-lg border border-[#30363d]/30 cursor-pointer hover:border-[#30363d] transition-colors">
                                        <input
                                            type="checkbox"
                                            checked={settings[setting.key] as boolean || false}
                                            onChange={(e) => setSettings({ ...settings, [setting.key]: e.target.checked })}
                                            className="mt-0.5 w-4 h-4 rounded border-[#30363d] bg-[#21262d] text-orange-500 focus:ring-orange-500/30 focus:ring-offset-0"
                                        />
                                        <span className="text-xs text-[#8b949e] leading-relaxed">{setting.description}</span>
                                    </label>
                                ) : setting.type === 'select' ? (
                                    <select
                                        value={settings[setting.key] as string || ''}
                                        onChange={(e) => setSettings({ ...settings, [setting.key]: e.target.value })}
                                        className="w-full h-10 px-3 bg-[#161b22] border border-[#30363d]/30 rounded-lg text-white text-sm focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/20"
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
                                        className="h-10 bg-[#161b22] border-[#30363d]/30 text-white text-sm placeholder:text-[#8b949e] focus-visible:ring-orange-500/20 focus-visible:border-orange-500/50 rounded-lg"
                                    />
                                )}

                                {setting.description && setting.type !== 'boolean' && (
                                    <p className="text-xs text-[#484f58] mt-1.5 leading-relaxed">{setting.description}</p>
                                )}
                            </div>
                        ))}
                    </div>

                    <Button
                        onClick={handleSave}
                        className={cn(
                            "w-full mt-6 h-10 rounded-lg font-medium text-sm transition-all",
                            showSaved
                                ? "bg-orange-500/20 text-orange-400 hover:bg-orange-500/20"
                                : "bg-orange-500 text-white hover:bg-orange-600"
                        )}
                        disabled={showSaved}
                    >
                        {showSaved ? (
                            <>
                                <Check size={16} className="mr-2" />
                                Settings Saved
                            </>
                        ) : (
                            'Save Settings'
                        )}
                    </Button>
                </div>
            )}

            {/* Capabilities */}
            <div className="px-6 py-4 border-t border-[#30363d]/30 bg-[#161b22]/30">
                <h4 className="text-xs font-semibold text-white uppercase tracking-wider mb-3">Capabilities</h4>
                <div className="flex flex-wrap gap-2">
                    {plugin.metadata.capabilities.canProcessMessages && (
                        <span className="px-3 py-1.5 text-xs font-medium rounded-lg bg-orange-500/10 text-orange-400 border border-orange-500/20">
                            Process Messages
                        </span>
                    )}
                    {plugin.metadata.capabilities.canModifyResponses && (
                        <span className="px-3 py-1.5 text-xs font-medium rounded-lg bg-orange-500/10 text-orange-400 border border-orange-500/20">
                            Modify Responses
                        </span>
                    )}
                    {plugin.metadata.capabilities.canAddSlashCommands && (
                        <span className="px-3 py-1.5 text-xs font-medium rounded-lg bg-orange-500/10 text-orange-400 border border-orange-500/20">
                            Slash Commands
                        </span>
                    )}
                    {plugin.metadata.capabilities.requiresApiKey && (
                        <span className="px-3 py-1.5 text-xs font-medium rounded-lg bg-[#21262d] text-[#8b949e] border border-[#30363d]/30">
                            API Key Required
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}
