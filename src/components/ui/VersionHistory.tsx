import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X,
    RotateCcw,
    Clock,
    Tag,
    Trash2,
    ChevronDown,
    ChevronRight,
    Check,
    Edit3
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from './button';
import {
    type CanvasVersion,
    getVersionHistory,
    restoreVersion,
    updateVersionLabel,
    deleteVersion,
    formatVersionTime,
    compareVersions,
    getDiffSummary,
} from '../../lib/canvasVersioning';

interface VersionHistoryProps {
    itemId: string;
    currentContent: string;
    onRestore: (content: string) => void;
    onClose: () => void;
}

export function VersionHistory({
    itemId,
    currentContent,
    onRestore,
    onClose,
}: VersionHistoryProps) {
    const [versions, setVersions] = useState<CanvasVersion[]>(() => getVersionHistory(itemId));
    const [selectedVersion, setSelectedVersion] = useState<string | null>(null);
    const [expandedVersion, setExpandedVersion] = useState<string | null>(null);
    const [editingLabel, setEditingLabel] = useState<string | null>(null);
    const [labelInput, setLabelInput] = useState('');
    const [showConfirmRestore, setShowConfirmRestore] = useState(false);

    // Refresh versions list
    const refreshVersions = useCallback(() => {
        setVersions(getVersionHistory(itemId));
    }, [itemId]);

    // Get diff between version and current
    const getVersionDiff = useCallback((version: CanvasVersion) => {
        const currentVersion: CanvasVersion = {
            id: 'current',
            itemId,
            content: currentContent,
            timestamp: Date.now(),
            autoSaved: false,
        };
        return compareVersions(version, currentVersion);
    }, [itemId, currentContent]);

    // Handle restore
    const handleRestore = useCallback(() => {
        if (!selectedVersion) return;

        const content = restoreVersion(itemId, selectedVersion);
        if (content) {
            onRestore(content);
            setShowConfirmRestore(false);
            setSelectedVersion(null);
        }
    }, [selectedVersion, itemId, onRestore]);

    // Handle label update
    const handleSaveLabel = useCallback((versionId: string) => {
        updateVersionLabel(itemId, versionId, labelInput);
        setEditingLabel(null);
        refreshVersions();
    }, [itemId, labelInput, refreshVersions]);

    // Handle delete
    const handleDelete = useCallback((versionId: string) => {
        deleteVersion(itemId, versionId);
        refreshVersions();
        if (selectedVersion === versionId) {
            setSelectedVersion(null);
        }
    }, [itemId, selectedVersion, refreshVersions]);

    // Selected version data
    const selectedVersionData = useMemo(() => {
        if (!selectedVersion) return null;
        return versions.find(v => v.id === selectedVersion);
    }, [selectedVersion, versions]);

    return (
        <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="absolute right-0 top-0 bottom-0 w-80 bg-[#0a0a0a] border-l border-white/10 flex flex-col z-10"
        >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                    <Clock size={16} className="text-gray-400" />
                    <span className="text-sm font-medium text-white">Version History</span>
                </div>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onClose}
                    className="h-7 w-7 text-gray-400 hover:text-white"
                >
                    <X size={16} />
                </Button>
            </div>

            {/* Version list */}
            <div className="flex-1 overflow-y-auto">
                {versions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center p-4">
                        <Clock size={32} className="text-gray-600 mb-2" />
                        <p className="text-sm text-gray-500">No versions saved yet</p>
                        <p className="text-xs text-gray-600 mt-1">
                            Versions are automatically saved as you edit
                        </p>
                    </div>
                ) : (
                    <div className="p-2 space-y-1">
                        {/* Current unsaved */}
                        <div className="px-3 py-2 rounded-md bg-blue-500/10 border border-blue-500/30">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                                <span className="text-sm text-blue-400 font-medium">Current (unsaved)</span>
                            </div>
                        </div>

                        {/* Version timeline */}
                        {versions.map((version, index) => {
                            const isSelected = selectedVersion === version.id;
                            const isExpanded = expandedVersion === version.id;
                            const isEditing = editingLabel === version.id;
                            const diff = getVersionDiff(version);

                            return (
                                <div
                                    key={version.id}
                                    className={cn(
                                        'rounded-md border transition-colors cursor-pointer',
                                        isSelected
                                            ? 'bg-white/10 border-white/30'
                                            : 'bg-white/5 border-transparent hover:bg-white/10'
                                    )}
                                    onClick={() => setSelectedVersion(version.id)}
                                >
                                    {/* Version header */}
                                    <div className="px-3 py-2">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                {/* Timeline indicator */}
                                                <div className="flex flex-col items-center">
                                                    <div className={cn(
                                                        'w-2 h-2 rounded-full',
                                                        version.autoSaved ? 'bg-gray-500' : 'bg-green-500'
                                                    )} />
                                                    {index < versions.length - 1 && (
                                                        <div className="w-px h-4 bg-white/10" />
                                                    )}
                                                </div>

                                                {/* Version info */}
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        {isEditing ? (
                                                            <input
                                                                type="text"
                                                                value={labelInput}
                                                                onChange={(e) => setLabelInput(e.target.value)}
                                                                onClick={(e) => e.stopPropagation()}
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'Enter') handleSaveLabel(version.id);
                                                                    if (e.key === 'Escape') setEditingLabel(null);
                                                                }}
                                                                className="bg-transparent border border-white/30 rounded px-2 py-0.5 text-sm text-white focus:outline-none focus:border-blue-500"
                                                                autoFocus
                                                            />
                                                        ) : (
                                                            <span className="text-sm text-white">
                                                                {version.label || `Version ${versions.length - index}`}
                                                            </span>
                                                        )}
                                                        {version.autoSaved && (
                                                            <span className="text-xs text-gray-500">(auto)</span>
                                                        )}
                                                    </div>
                                                    <span className="text-xs text-gray-500">
                                                        {formatVersionTime(version.timestamp)}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Expand button */}
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setExpandedVersion(isExpanded ? null : version.id);
                                                }}
                                                className="text-gray-500 hover:text-white"
                                            >
                                                {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                            </button>
                                        </div>

                                        {/* Diff summary */}
                                        <div className="mt-1 text-xs">
                                            <span className="text-green-400">+{diff.additions}</span>
                                            <span className="text-gray-500 mx-1">/</span>
                                            <span className="text-red-400">-{diff.deletions}</span>
                                        </div>
                                    </div>

                                    {/* Expanded content */}
                                    <AnimatePresence>
                                        {isExpanded && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                className="overflow-hidden border-t border-white/10"
                                            >
                                                <div className="p-3 space-y-2">
                                                    {/* Preview */}
                                                    <div className="max-h-32 overflow-y-auto bg-black/30 rounded p-2 text-xs font-mono text-gray-400">
                                                        {version.content.substring(0, 500)}
                                                        {version.content.length > 500 && '...'}
                                                    </div>

                                                    {/* Actions */}
                                                    <div className="flex items-center gap-1">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setEditingLabel(version.id);
                                                                setLabelInput(version.label || '');
                                                            }}
                                                            className="h-7 text-xs text-gray-400 hover:text-white"
                                                        >
                                                            {isEditing ? <Check size={12} /> : <Edit3 size={12} />}
                                                            <span className="ml-1">{isEditing ? 'Save' : 'Label'}</span>
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleDelete(version.id);
                                                            }}
                                                            className="h-7 text-xs text-gray-400 hover:text-red-400"
                                                        >
                                                            <Trash2 size={12} />
                                                            <span className="ml-1">Delete</span>
                                                        </Button>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Footer actions */}
            {selectedVersion && (
                <div className="border-t border-white/10 p-3">
                    {showConfirmRestore ? (
                        <div className="space-y-2">
                            <p className="text-sm text-yellow-400">
                                This will replace your current content. Continue?
                            </p>
                            <div className="flex gap-2">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setShowConfirmRestore(false)}
                                    className="flex-1 text-gray-400"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={handleRestore}
                                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                                >
                                    <RotateCcw size={14} className="mr-1" />
                                    Restore
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <Button
                            onClick={() => setShowConfirmRestore(true)}
                            className="w-full bg-white/10 hover:bg-white/20 text-white"
                        >
                            <RotateCcw size={14} className="mr-2" />
                            Restore Selected Version
                        </Button>
                    )}
                </div>
            )}
        </motion.div>
    );
}

export default VersionHistory;
