import { useCallback } from 'react';
import { Trash2, Copy, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from './button';

export interface ConsoleEntry {
    id: string;
    type: 'log' | 'error' | 'warn' | 'info';
    message: string;
    timestamp: number;
}

interface ConsolePanelProps {
    logs: ConsoleEntry[];
    onClear: () => void;
    className?: string;
    maxHeight?: string;
}

const TYPE_STYLES: Record<ConsoleEntry['type'], { icon: React.ReactNode; bg: string; text: string }> = {
    log: {
        icon: null,
        bg: 'bg-transparent',
        text: 'text-gray-300',
    },
    error: {
        icon: <AlertCircle size={12} />,
        bg: 'bg-red-500/10',
        text: 'text-red-400',
    },
    warn: {
        icon: <AlertTriangle size={12} />,
        bg: 'bg-yellow-500/10',
        text: 'text-yellow-400',
    },
    info: {
        icon: <Info size={12} />,
        bg: 'bg-blue-500/10',
        text: 'text-blue-400',
    },
};

function formatTime(timestamp: number): string {
    return new Date(timestamp).toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    });
}

export function ConsolePanel({
    logs,
    onClear,
    className,
    maxHeight = '150px',
}: ConsolePanelProps) {
    const handleCopyAll = useCallback(async () => {
        const text = logs.map(log => `[${log.type.toUpperCase()}] ${formatTime(log.timestamp)}: ${log.message}`).join('\n');
        try {
            await navigator.clipboard.writeText(text);
        } catch (e) {
            console.error('Failed to copy console output:', e);
        }
    }, [logs]);

    return (
        <div className={cn('flex flex-col border-t border-white/10 bg-[#0a0a0a]', className)}>
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/10">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-gray-400">Console</span>
                    {logs.length > 0 && (
                        <span className="text-xs text-gray-600">({logs.length})</span>
                    )}
                </div>
                <div className="flex items-center gap-1">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleCopyAll}
                        disabled={logs.length === 0}
                        className="h-6 w-6 text-gray-500 hover:text-gray-300 disabled:opacity-30"
                        title="Copy all"
                    >
                        <Copy size={12} />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onClear}
                        disabled={logs.length === 0}
                        className="h-6 w-6 text-gray-500 hover:text-gray-300 disabled:opacity-30"
                        title="Clear console"
                    >
                        <Trash2 size={12} />
                    </Button>
                </div>
            </div>

            {/* Log entries */}
            <div
                className="overflow-y-auto font-mono text-xs"
                style={{ maxHeight }}
            >
                {logs.length === 0 ? (
                    <div className="flex items-center justify-center py-4 text-gray-600">
                        Console output will appear here
                    </div>
                ) : (
                    logs.map((log) => {
                        const style = TYPE_STYLES[log.type];
                        return (
                            <div
                                key={log.id}
                                className={cn(
                                    'flex items-start gap-2 px-3 py-1 border-b border-white/5',
                                    style.bg
                                )}
                            >
                                {/* Timestamp */}
                                <span className="flex-shrink-0 text-gray-600">
                                    {formatTime(log.timestamp)}
                                </span>

                                {/* Type icon */}
                                {style.icon && (
                                    <span className={cn('flex-shrink-0 mt-0.5', style.text)}>
                                        {style.icon}
                                    </span>
                                )}

                                {/* Message */}
                                <span className={cn('flex-1 whitespace-pre-wrap break-all', style.text)}>
                                    {log.message}
                                </span>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}

/**
 * Helper to create a console entry
 */
export function createConsoleEntry(
    message: string,
    type: ConsoleEntry['type'] = 'log'
): ConsoleEntry {
    return {
        id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        type,
        message,
        timestamp: Date.now(),
    };
}

export default ConsolePanel;
