/**
 * Settings Modal Component for MIRA
 * Minimalist settings panel for user preferences
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X,
    Settings,
    Shield,
    Database,
    Trash2,
    Download,
    Lock,
} from 'lucide-react';
import { Button } from './button';
import { Input } from './input';
import { cn } from '../../lib/utils';
import { chatStorage } from '../../lib/chatStorage';
import { MIRA_MODELS } from '../ModelSelector';
import { useAuth } from '../../contexts/AuthContext';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentModel?: string;
    onModelChange?: (model: string) => void;
}

type SettingsTab = 'general' | 'privacy' | 'data';

interface SettingsState {
    // General
    userName: string;
    defaultModel: string;
    autoSave: boolean;
    webSearchEnabled: boolean;
    deepThinkEnabled: boolean;
    
    // Privacy
    analyticsEnabled: boolean;
    saveHistory: boolean;
    
    // Data
    storageUsed: string;
}

export function SettingsModal({ isOpen, onClose, currentModel, onModelChange }: SettingsModalProps) {
    const [activeTab, setActiveTab] = useState<SettingsTab>('general');
    const { isPremium } = useAuth();
    const [settings, setSettings] = useState<SettingsState>({
        userName: localStorage.getItem('mira-user-name') || '',
        defaultModel: currentModel || localStorage.getItem('mira-default-model') || 'auto',
        autoSave: localStorage.getItem('mira-auto-save') !== 'false',
        webSearchEnabled: localStorage.getItem('mira-web-search') === 'true',
        deepThinkEnabled: localStorage.getItem('mira-deep-think') === 'true',
        analyticsEnabled: localStorage.getItem('mira-analytics') !== 'false',
        saveHistory: localStorage.getItem('mira-save-history') !== 'false',
        storageUsed: '0 MB',
    });

    const [showSaved, setShowSaved] = useState(false);

    // Calculate storage usage
    useEffect(() => {
        if (isOpen) {
            const sessions = chatStorage.getAllSessions();
            const totalMessages = sessions.reduce((acc: number, session) => acc + session.messages.length, 0);
            const estimatedSize = (totalMessages * 0.5).toFixed(2); // Rough estimate in KB
            setSettings(prev => ({
                ...prev,
                storageUsed: estimatedSize + ' KB'
            }));
        }
    }, [isOpen]);

    const tabs = [
        { id: 'general' as SettingsTab, label: 'General', icon: Settings },
        { id: 'privacy' as SettingsTab, label: 'Privacy', icon: Shield },
        { id: 'data' as SettingsTab, label: 'Data', icon: Database },
    ];

    const handleSave = () => {
        // Free users can only use 'auto' model
        const modelToSave = !isPremium ? 'auto' : settings.defaultModel;
        
        // Save to localStorage
        localStorage.setItem('mira-user-name', settings.userName);
        localStorage.setItem('mira-default-model', modelToSave);
        localStorage.setItem('mira-auto-save', settings.autoSave.toString());
        localStorage.setItem('mira-web-search', settings.webSearchEnabled.toString());
        localStorage.setItem('mira-deep-think', settings.deepThinkEnabled.toString());
        localStorage.setItem('mira-analytics', settings.analyticsEnabled.toString());
        localStorage.setItem('mira-save-history', settings.saveHistory.toString());

        // Update current model if callback provided
        if (onModelChange && modelToSave !== currentModel) {
            onModelChange(modelToSave);
        }

        setShowSaved(true);
        setTimeout(() => {
            setShowSaved(false);
            // Reload to apply settings
            window.location.reload();
        }, 1500);
    };

    const handleClearData = () => {
        if (confirm('Are you sure you want to clear all chat history? This cannot be undone.')) {
            chatStorage.getAllSessions().forEach((session) => {
                chatStorage.deleteSession(session.id);
            });
            setSettings(prev => ({ ...prev, storageUsed: '0 KB' }));
            alert('Chat history cleared successfully. The page will reload.');
            setTimeout(() => window.location.reload(), 1000);
        }
    };

    const handleExportData = () => {
        const data = {
            settings,
            chats: localStorage.getItem('mira-chat-sessions'),
            timestamp: new Date().toISOString(),
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `mira-export-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
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
                        className="relative w-full max-w-4xl max-h-[85vh] bg-[#0d1117] rounded-2xl border border-[#30363d]/50 shadow-2xl overflow-hidden flex"
                    >
                        {/* Sidebar */}
                        <div className="w-56 border-r border-[#30363d]/50 bg-[#161b22]/30 flex flex-col">
                            <div className="px-6 py-5 border-b border-[#30363d]/50">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
                                        <Settings className="text-orange-400" size={20} />
                                    </div>
                                    <div>
                                        <h2 className="text-base font-semibold text-white">Settings</h2>
                                        <p className="text-xs text-[#8b949e]">Preferences</p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex-1 py-3 px-3">
                                {tabs.map((tab) => {
                                    const Icon = tab.icon;
                                    return (
                                        <button
                                            key={tab.id}
                                            onClick={() => setActiveTab(tab.id)}
                                            className={cn(
                                                "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all mb-1",
                                                activeTab === tab.id
                                                    ? "bg-orange-500/10 text-orange-400"
                                                    : "text-[#8b949e] hover:text-white hover:bg-[#21262d]"
                                            )}
                                        >
                                            <Icon size={18} />
                                            {tab.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Main Content */}
                        <div className="flex-1 flex flex-col overflow-hidden">
                            {/* Header */}
                            <div className="px-6 py-5 border-b border-[#30363d]/50 flex items-center justify-between">
                                <div>
                                    <h3 className="text-lg font-semibold text-white">
                                        {tabs.find(t => t.id === activeTab)?.label}
                                    </h3>
                                    <p className="text-sm text-[#8b949e] mt-0.5">
                                        Manage your {activeTab} settings
                                    </p>
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

                            {/* Content */}
                            <div className="flex-1 overflow-y-auto px-6 py-6">
                                {activeTab === 'general' && (
                                    <div className="space-y-6">
                                        <div>
                                            <label className="block text-sm font-medium text-white mb-2">
                                                Display Name
                                            </label>
                                            <Input
                                                type="text"
                                                value={settings.userName}
                                                onChange={(e) => setSettings({ ...settings, userName: e.target.value })}
                                                placeholder="Enter your name"
                                                className="h-10 bg-[#161b22] border-[#30363d]/30 text-white placeholder:text-[#8b949e] focus-visible:ring-orange-500/20 focus-visible:border-orange-500/50 rounded-lg"
                                            />
                                            <p className="text-xs text-[#8b949e] mt-2">This name will be used across the app</p>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-white mb-2">
                                                Default AI Model
                                            </label>
                                            <div className="space-y-2">
                                                {MIRA_MODELS.map((model) => {
                                                    const isLocked = !isPremium && model.id !== 'auto';
                                                    const isSelected = settings.defaultModel === model.id;
                                                    
                                                    return (
                                                        <button
                                                            key={model.id}
                                                            onClick={() => !isLocked && setSettings({ ...settings, defaultModel: model.id })}
                                                            disabled={isLocked}
                                                            className={cn(
                                                                "w-full flex items-center justify-between p-3 rounded-lg border transition-all",
                                                                isSelected 
                                                                    ? "border-orange-500/50 bg-orange-500/10" 
                                                                    : "border-[#30363d]/30 hover:border-[#30363d]",
                                                                isLocked && "opacity-50 cursor-not-allowed"
                                                            )}
                                                        >
                                                            <div className="text-left flex-1">
                                                                <div className="flex items-center gap-2">
                                                                    <span className={cn(
                                                                        "text-sm font-medium",
                                                                        isSelected ? "text-orange-400" : "text-white"
                                                                    )}>
                                                                        {model.displayName}
                                                                    </span>
                                                                    {isLocked && (
                                                                        <Lock size={14} className="text-[#8b949e]" />
                                                                    )}
                                                                </div>
                                                                <p className="text-xs text-[#8b949e] mt-0.5">
                                                                    {model.description}
                                                                </p>
                                                            </div>
                                                            {isSelected && (
                                                                <div className="w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center ml-2">
                                                                    <div className="w-2 h-2 rounded-full bg-white" />
                                                                </div>
                                                            )}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                            <p className="text-xs text-[#8b949e] mt-2">
                                                {isPremium 
                                                    ? 'Select your preferred AI model for new chats' 
                                                    : 'Free users can only use Auto mode. Upgrade to Premium to unlock all models.'
                                                }
                                            </p>
                                        </div>

                                        <div className="flex items-start gap-3 p-4 bg-[#161b22] rounded-xl border border-[#30363d]/30">
                                            <input
                                                type="checkbox"
                                                checked={settings.autoSave}
                                                onChange={(e) => setSettings({ ...settings, autoSave: e.target.checked })}
                                                className="mt-0.5 w-4 h-4 rounded border-[#30363d] bg-[#21262d] text-orange-500 focus:ring-orange-500/30 focus:ring-offset-0"
                                            />
                                            <div className="flex-1">
                                                <label className="text-sm font-medium text-white cursor-pointer">
                                                    Auto-save conversations
                                                </label>
                                                <p className="text-xs text-[#8b949e] mt-1">
                                                    Automatically save chat history after each message
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-start gap-3 p-4 bg-[#161b22] rounded-xl border border-[#30363d]/30">
                                            <input
                                                type="checkbox"
                                                checked={settings.webSearchEnabled}
                                                onChange={(e) => setSettings({ ...settings, webSearchEnabled: e.target.checked })}
                                                className="mt-0.5 w-4 h-4 rounded border-[#30363d] bg-[#21262d] text-orange-500 focus:ring-orange-500/30 focus:ring-offset-0"
                                            />
                                            <div className="flex-1">
                                                <label className="text-sm font-medium text-white cursor-pointer">
                                                    Enable web search by default
                                                </label>
                                                <p className="text-xs text-[#8b949e] mt-1">
                                                    Automatically search the web for real-time information
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-start gap-3 p-4 bg-[#161b22] rounded-xl border border-[#30363d]/30">
                                            <input
                                                type="checkbox"
                                                checked={settings.deepThinkEnabled}
                                                onChange={(e) => setSettings({ ...settings, deepThinkEnabled: e.target.checked })}
                                                className="mt-0.5 w-4 h-4 rounded border-[#30363d] bg-[#21262d] text-orange-500 focus:ring-orange-500/30 focus:ring-offset-0"
                                            />
                                            <div className="flex-1">
                                                <label className="text-sm font-medium text-white cursor-pointer">
                                                    Enable deep thinking mode
                                                </label>
                                                <p className="text-xs text-[#8b949e] mt-1">
                                                    Use advanced reasoning for complex questions
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'privacy' && (
                                    <div className="space-y-6">
                                        <div className="flex items-start gap-3 p-4 bg-[#161b22] rounded-xl border border-[#30363d]/30">
                                            <input
                                                type="checkbox"
                                                checked={settings.analyticsEnabled}
                                                onChange={(e) => setSettings({ ...settings, analyticsEnabled: e.target.checked })}
                                                className="mt-0.5 w-4 h-4 rounded border-[#30363d] bg-[#21262d] text-orange-500 focus:ring-orange-500/30 focus:ring-offset-0"
                                            />
                                            <div className="flex-1">
                                                <label className="text-sm font-medium text-white cursor-pointer">
                                                    Enable Analytics
                                                </label>
                                                <p className="text-xs text-[#8b949e] mt-1">
                                                    Help us improve MIRA by sharing anonymous usage data
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-start gap-3 p-4 bg-[#161b22] rounded-xl border border-[#30363d]/30">
                                            <input
                                                type="checkbox"
                                                checked={settings.saveHistory}
                                                onChange={(e) => setSettings({ ...settings, saveHistory: e.target.checked })}
                                                className="mt-0.5 w-4 h-4 rounded border-[#30363d] bg-[#21262d] text-orange-500 focus:ring-orange-500/30 focus:ring-offset-0"
                                            />
                                            <div className="flex-1">
                                                <label className="text-sm font-medium text-white cursor-pointer">
                                                    Save Chat History
                                                </label>
                                                <p className="text-xs text-[#8b949e] mt-1">
                                                    Store your conversations locally for future reference
                                                </p>
                                            </div>
                                        </div>

                                        <div className="p-4 bg-orange-500/5 border border-orange-500/20 rounded-xl">
                                            <h4 className="text-sm font-medium text-orange-400 mb-2">Privacy Notice</h4>
                                            <p className="text-xs text-[#8b949e] leading-relaxed">
                                                All your data is stored locally on your device. We never send your conversations 
                                                to external servers except for AI model processing. Your privacy is our priority.
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'data' && (
                                    <div className="space-y-6">
                                        <div className="p-4 bg-[#161b22] rounded-xl border border-[#30363d]/30">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-sm font-medium text-white">Storage Used</span>
                                                <span className="text-sm text-orange-400">{settings.storageUsed}</span>
                                            </div>
                                            <div className="h-2 bg-[#21262d] rounded-full overflow-hidden">
                                                <div className="h-full bg-orange-500 rounded-full" style={{ width: '15%' }} />
                                            </div>
                                            <p className="text-xs text-[#8b949e] mt-2">Local storage limit: 10 MB</p>
                                        </div>

                                        <div>
                                            <h4 className="text-sm font-medium text-white mb-3">Data Management</h4>
                                            <div className="space-y-3">
                                                <Button
                                                    onClick={handleExportData}
                                                    className="w-full h-10 bg-[#21262d] text-white hover:bg-[#30363d] rounded-lg font-medium text-sm justify-start"
                                                >
                                                    <Download size={16} className="mr-2" />
                                                    Export All Data
                                                </Button>

                                                <Button
                                                    onClick={handleClearData}
                                                    className="w-full h-10 bg-[#21262d] text-[#8b949e] hover:bg-red-500/10 hover:text-red-400 rounded-lg font-medium text-sm justify-start"
                                                >
                                                    <Trash2 size={16} className="mr-2" />
                                                    Clear All Chat History
                                                </Button>
                                            </div>
                                        </div>

                                        <div className="p-4 bg-[#161b22] border border-[#30363d]/30 rounded-xl">
                                            <h4 className="text-sm font-medium text-white mb-2">About MIRA</h4>
                                            <div className="space-y-1 text-xs text-[#8b949e]">
                                                <p>Version: 1.0.0</p>
                                                <p>Last Updated: December 2025</p>
                                                <p>Build: Production</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Footer */}
                            <div className="px-6 py-4 border-t border-[#30363d]/30 bg-[#161b22]/30 flex items-center justify-between">
                                <Button
                                    variant="ghost"
                                    onClick={onClose}
                                    className="h-9 px-4 text-[#8b949e] hover:text-white hover:bg-[#21262d] rounded-lg"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleSave}
                                    disabled={showSaved}
                                    className={cn(
                                        "h-9 px-6 rounded-lg font-medium text-sm transition-all",
                                        showSaved
                                            ? "bg-orange-500/20 text-orange-400"
                                            : "bg-orange-500 text-white hover:bg-orange-600"
                                    )}
                                >
                                    {showSaved ? 'Saved!' : 'Save Changes'}
                                </Button>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
