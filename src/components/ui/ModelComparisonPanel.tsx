import { useEffect, useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { X, Copy, Brain, ChevronDown, ChevronUp, Check, Sparkles, Zap, Trophy } from 'lucide-react';
import { Button } from './button';
import { CodeBlock } from './CodeBlock';
import type { MiraModel } from '../ModelSelector';
import { cn } from '../../lib/utils';

export interface ComparisonResultState {
    modelId: string;
    label: string;
    status: 'loading' | 'success' | 'error';
    content: string;
    error?: string;
}

export interface ComparisonRunState {
    id: string;
    prompt: string;
    results: Record<string, ComparisonResultState>;
}

interface ModelComparisonPanelProps {
    isOpen: boolean;
    prompt: string;
    suggestedModels: string[];
    availableModels: MiraModel[];
    onClose: () => void;
    onCompare: (models: string[]) => void;
    comparisonRun: ComparisonRunState | null;
}

export function ModelComparisonPanel({
    isOpen,
    prompt,
    suggestedModels,
    availableModels,
    onClose,
    onCompare,
    comparisonRun,
}: ModelComparisonPanelProps) {
    const [selectedModels, setSelectedModels] = useState<string[]>(suggestedModels);
    const [isCopyingPrompt, setIsCopyingPrompt] = useState(false);
    const [expandedThinking, setExpandedThinking] = useState<Record<string, boolean>>({});

    useEffect(() => {
        if (isOpen) {
            setSelectedModels(suggestedModels);
        }
    }, [isOpen, suggestedModels]);

    const modelLookup = useMemo(() => {
        return availableModels.reduce<Record<string, MiraModel>>((acc, model) => {
            acc[model.id] = model;
            return acc;
        }, {});
    }, [availableModels]);

    if (!isOpen) {
        return null;
    }

    const handleToggleModel = (modelId: string) => {
        setSelectedModels(prev => {
            if (prev.includes(modelId)) {
                return prev.filter(id => id !== modelId);
            }
            if (prev.length >= 2) {
                return [prev[1], modelId];
            }
            return [...prev, modelId];
        });
    };

    const handleCopyPrompt = async () => {
        try {
            setIsCopyingPrompt(true);
            await navigator.clipboard.writeText(prompt);
        } catch (error) {
            console.error('Failed to copy prompt:', error);
        } finally {
            setIsCopyingPrompt(false);
        }
    };

    const handleRunComparison = () => {
        if (selectedModels.length === 2) {
            // Reset thinking state on new run
            setExpandedThinking({});
            onCompare(selectedModels);
        }
    };

    const parseContent = (content: string) => {
        const thinkingMatch = content.match(/<thinking>([\s\S]*?)<\/thinking>/);
        if (thinkingMatch) {
            return {
                thinking: thinkingMatch[1].trim(),
                response: content.replace(/<thinking>[\s\S]*?<\/thinking>/, '').trim(),
            };
        }
        return { thinking: null, response: content };
    };

    const toggleThinking = (modelId: string) => {
        setExpandedThinking(prev => ({
            ...prev,
            [modelId]: !prev[modelId]
        }));
    };

    const renderResultBody = () => {
        if (!comparisonRun) {
            return (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-16 h-16 rounded-full bg-orange-500/10 flex items-center justify-center mb-4">
                        <Trophy className="w-8 h-8 text-orange-400" />
                    </div>
                    <h4 className="text-lg font-medium text-white mb-2">Ready to Compare</h4>
                    <p className="text-sm text-[#8b949e] max-w-sm">
                        Select two models above and click "Run Comparison" to see how they answer the same prompt differently.
                    </p>
                </div>
            );
        }

        const results = Object.values(comparisonRun.results);

        if (results.length === 0) {
            return (
                <div className="flex flex-col items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mb-4"></div>
                    <p className="text-sm text-[#8b949e]">Initializing comparison...</p>
                </div>
            );
        }

        return (
            <div className={cn(
                'grid gap-6',
                results.length > 1 ? 'md:grid-cols-2' : 'md:grid-cols-1'
            )}>
                {results.map(result => {
                    const { thinking, response } = parseContent(result.content);
                    const isThinkingExpanded = expandedThinking[result.modelId];

                    return (
                        <div
                            key={result.modelId}
                            className="flex flex-col rounded-2xl border border-[#30363d] bg-[#0d1117] overflow-hidden shadow-lg transition-all hover:border-orange-500/30"
                        >
                            {/* Card Header */}
                            <div className="flex items-center justify-between px-4 py-3 bg-[#161b22] border-b border-[#30363d]">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-[#21262d] flex items-center justify-center items-center text-orange-400 font-bold border border-white/5">
                                        {result.modelId.includes('gemini') ? 'G' : 'M'}
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-white leading-tight">
                                            {modelLookup[result.modelId]?.displayName || result.label}
                                        </p>
                                        <p className="text-[10px] text-[#8b949e] uppercase tracking-wider">
                                            {modelLookup[result.modelId]?.name || result.modelId}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {result.status === 'loading' && (
                                        <div className="flex items-center gap-1.5 px-2 py-1 bg-orange-500/10 rounded-full border border-orange-500/20">
                                            <div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                                            <span className="text-xs text-orange-400 font-medium">Generating</span>
                                        </div>
                                    )}
                                    {result.status === 'success' && (
                                        <div className="px-2 py-1 bg-green-500/10 rounded-full border border-green-500/20">
                                            <span className="text-xs text-green-400 font-medium">Complete</span>
                                        </div>
                                    )}
                                    {result.status === 'error' && (
                                        <div className="px-2 py-1 bg-red-500/10 rounded-full border border-red-500/20">
                                            <span className="text-xs text-red-400 font-medium">Error</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Card Body */}
                            <div className="flex-1 p-4 bg-[#0d1117] overflow-y-auto max-h-[600px] min-h-[200px]">
                                {result.status === 'error' ? (
                                    <div className="flex flex-col items-center justify-center h-full text-center p-4">
                                        <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center mb-2">
                                            <X className="w-5 h-5 text-red-400" />
                                        </div>
                                        <p className="text-red-400 text-sm">{result.error || 'Failed to generate response'}</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {/* Thinking Block */}
                                        {thinking && (
                                            <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 overflow-hidden">
                                                <button
                                                    onClick={() => toggleThinking(result.modelId)}
                                                    className="w-full flex items-center justify-between px-3 py-2 bg-blue-500/10 hover:bg-blue-500/20 transition-colors"
                                                >
                                                    <div className="flex items-center gap-2 text-blue-400">
                                                        <Brain size={14} />
                                                        <span className="text-xs font-semibold uppercase tracking-wider">Thinking Process</span>
                                                    </div>
                                                    {isThinkingExpanded ? <ChevronUp size={14} className="text-blue-400" /> : <ChevronDown size={14} className="text-blue-400" />}
                                                </button>
                                                {isThinkingExpanded && (
                                                    <div className="p-3 text-xs text-blue-300/80 font-mono whitespace-pre-wrap border-t border-blue-500/10 bg-[#0d1117]/50">
                                                        {thinking}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Main Content */}
                                        {response ? (
                                            <div className="prose prose-invert prose-sm max-w-none prose-p:leading-relaxed prose-pre:p-0 prose-pre:bg-transparent">
                                                <ReactMarkdown
                                                    remarkPlugins={[remarkGfm]}
                                                    components={{
                                                        code({ node: _node, inline, className, children, ...props }: { node?: unknown; inline?: boolean; className?: string; children?: React.ReactNode }) {
                                                            const match = /language-(\w+)/.exec(className || '');
                                                            const codeContent = String(children).replace(/\n$/, '');

                                                            if (!inline && match) {
                                                                return (
                                                                    <CodeBlock language={match[1]}>
                                                                        {codeContent}
                                                                    </CodeBlock>
                                                                );
                                                            }
                                                            return (
                                                                <code className={className} {...props}>
                                                                    {children}
                                                                </code>
                                                            );
                                                        }
                                                    }}
                                                >
                                                    {response}
                                                </ReactMarkdown>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2 text-[#8b949e] animate-pulse">
                                                <span className="w-2 h-2 bg-[#8b949e] rounded-full" />
                                                <span className="text-sm">Waiting for response...</span>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    return (
        <>
            <div
                className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />
            <div className="fixed inset-x-4 bottom-4 md:right-6 md:left-auto md:w-[90vw] md:max-w-6xl z-[70] pointer-events-auto flex flex-col max-h-[90vh]">
                <div className="flex-1 flex flex-col rounded-3xl border border-[#30363d] bg-[#05080d] shadow-2xl overflow-hidden">
                    {/* Main Header */}
                    <div className="flex items-center justify-between gap-4 border-b border-white/5 bg-[#0d1117] px-6 py-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-gradient-to-br from-orange-500/20 to-purple-500/20 border border-white/5">
                                <Zap className="w-5 h-5 text-orange-400" fill="currentColor" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-white tracking-tight">Model Comparison</h3>
                                <p className="text-xs text-[#8b949e]">Test and verify model performance side-by-side</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="rounded-full bg-[#21262d] p-2 text-[#8b949e] hover:text-white hover:bg-[#30363d] transition-all"
                            aria-label="Close comparison panel"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        <div className="p-6 space-y-8">

                            {/* Prompt Section */}
                            <div className="group relative rounded-2xl border border-white/5 bg-[#0d1117] p-5 transition-all hover:border-white/10">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-xs font-semibold text-orange-400 uppercase tracking-wider flex items-center gap-2">
                                        <Sparkles size={12} />
                                        Test Prompt
                                    </span>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={handleCopyPrompt}
                                        disabled={!prompt}
                                        className="h-7 text-xs hover:bg-white/5"
                                    >
                                        {isCopyingPrompt ? <Check size={12} className="mr-1" /> : <Copy size={12} className="mr-1" />}
                                        {isCopyingPrompt ? 'Copied' : 'Copy'}
                                    </Button>
                                </div>
                                <p className="text-sm text-[#e6edf3] leading-relaxed whitespace-pre-wrap font-medium">
                                    {prompt || 'Select a message to start comparing...'}
                                </p>
                            </div>

                            {/* Model Selection */}
                            <div>
                                <div className="flex items-center justify-between mb-4">
                                    <h4 className="text-sm font-semibold text-white">Select Models to Compare</h4>
                                    <span className="text-xs px-2 py-1 rounded-full bg-[#21262d] text-[#8b949e] border border-[#30363d]">
                                        {selectedModels.length} / 2 Selected
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                    {availableModels.filter(m => m.id !== 'auto').map(model => {
                                        const isSelected = selectedModels.includes(model.id);
                                        const disabled = !isSelected && selectedModels.length >= 2;

                                        return (
                                            <button
                                                key={model.id}
                                                onClick={() => handleToggleModel(model.id)}
                                                disabled={disabled}
                                                className={cn(
                                                    "relative group flex flex-col items-start p-4 rounded-xl border transition-all duration-200 text-left",
                                                    isSelected
                                                        ? "bg-gradient-to-br from-orange-500/10 to-transparent border-orange-500/50 shadow-[0_0_15px_rgba(249,115,22,0.1)]"
                                                        : "bg-[#0d1117] border-[#30363d] hover:border-[#8b949e]/50 hover:bg-[#161b22]",
                                                    disabled && "opacity-40 cursor-not-allowed grayscale"
                                                )}
                                            >
                                                <div className="flex items-center justify-between w-full mb-2">
                                                    <span className={cn(
                                                        "text-xs font-bold px-1.5 py-0.5 rounded uppercase tracking-wider",
                                                        isSelected ? "bg-orange-500 text-white" : "bg-[#21262d] text-[#8b949e]"
                                                    )}>
                                                        {model.name.split('-')[1] || 'Base'}
                                                    </span>
                                                    {isSelected && <Check size={16} className="text-orange-500" />}
                                                </div>
                                                <p className={cn("text-sm font-bold mb-1", isSelected ? "text-white" : "text-[#c9d1d9]")}>
                                                    {model.displayName}
                                                </p>
                                                <p className="text-xs text-[#8b949e] line-clamp-2">
                                                    {model.description}
                                                </p>
                                            </button>
                                        );
                                    })}
                                </div>

                                <div className="flex justify-end mt-4">
                                    <Button
                                        onClick={handleRunComparison}
                                        disabled={selectedModels.length !== 2}
                                        className={cn(
                                            "px-6 py-2 rounded-full font-semibold transition-all shadow-lg hover:shadow-orange-500/20",
                                            selectedModels.length === 2
                                                ? "bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 text-white"
                                                : "bg-[#21262d] text-[#8b949e] cursor-not-allowed"
                                        )}
                                    >
                                        Run Comparison
                                    </Button>
                                </div>
                            </div>

                            {/* Results Area */}
                            <div className="border-t border-white/5 pt-8">
                                {renderResultBody()}
                            </div>

                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
