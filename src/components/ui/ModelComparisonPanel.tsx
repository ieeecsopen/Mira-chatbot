import { useEffect, useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { X, Copy } from 'lucide-react';
import { Button } from './button';
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
      onCompare(selectedModels);
    }
  };

  const renderResultBody = () => {
    if (!comparisonRun) {
      return (
        <p className="text-sm text-[#8b949e]">
          Select two models and start a comparison to see side-by-side answers.
        </p>
      );
    }

    const results = Object.values(comparisonRun.results);

    if (results.length === 0) {
      return (
        <p className="text-sm text-[#8b949e]">
          Comparison starting...
        </p>
      );
    }

    return (
      <div className={cn(
        'grid gap-4',
        results.length > 1 ? 'md:grid-cols-2' : 'md:grid-cols-1'
      )}>
        {results.map(result => (
          <div
            key={result.modelId}
            className="rounded-2xl border border-[#30363d] bg-[#0d1117] p-4 shadow-inner"
          >
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-white">{result.label}</p>
                <p className="text-xs text-[#8b949e]">{modelLookup[result.modelId]?.description || 'Custom model'}</p>
              </div>
              <div className="flex items-center gap-1 text-xs">
                {result.status === 'loading' && (
                  <span className="text-orange-400 animate-pulse">Streaming…</span>
                )}
                {result.status === 'success' && (
                  <span className="text-emerald-400">Complete</span>
                )}
                {result.status === 'error' && (
                  <span className="text-red-400">{result.error || 'Failed'}</span>
                )}
              </div>
            </div>

            <div className="mt-3 rounded-xl bg-[#0b0f15] p-3 text-sm text-[#c9d1d9] max-h-64 overflow-y-auto shadow">
              {result.status === 'error' ? (
                <p className="text-red-400">{result.error || 'Unable to fetch response.'}</p>
              ) : result.content ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{result.content}</ReactMarkdown>
              ) : (
                <p className="text-[#8b949e]">Waiting for tokens…</p>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur" 
        onClick={onClose}
      />
      <div className="fixed right-6 bottom-6 z-50 w-full max-w-4xl pointer-events-auto">
        <div className="rounded-3xl border border-[#30363d] bg-[#0d1117] shadow-2xl">
          <div className="flex items-start justify-between gap-4 border-b border-white/5 px-6 py-4">
            <div>
              <p className="text-xs uppercase tracking-widest text-orange-400">A/B Testing Lab</p>
              <h3 className="mt-1 text-xl font-semibold text-white">Compare model responses side-by-side</h3>
              <p className="text-sm text-[#8b949e]">Select two models, re-run the original prompt, and inspect the differences without leaving the chat.</p>
            </div>
            <button
              onClick={onClose}
              className="rounded-full border border-white/10 p-2 text-[#8b949e] hover:text-white hover:bg-white/5 transition"
              aria-label="Close comparison panel"
            >
              <X size={18} />
            </button>
          </div>

          <div className="px-6 py-5 space-y-5">
            <div className="rounded-2xl border border-white/5 bg-[#05080d] p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-white">Original prompt</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyPrompt}
                  disabled={!prompt}
                >
                  <Copy size={14} />
                  {isCopyingPrompt ? 'Copying…' : 'Copy'}
                </Button>
              </div>
              <p className="mt-3 max-h-40 overflow-y-auto whitespace-pre-line text-sm text-[#c9d1d9]">
                {prompt || 'Pick a response to compare and I will load the prompt here.'}
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between text-sm text-[#8b949e] mb-2">
                <span>Select two models to compare</span>
                <span>{selectedModels.length}/2 selected</span>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {availableModels.map(model => {
                  const isSelected = selectedModels.includes(model.id);
                  const disabled = !isSelected && selectedModels.length >= 2;
                  return (
                    <button
                      key={model.id}
                      onClick={() => handleToggleModel(model.id)}
                      disabled={disabled}
                      className={cn(
                        'rounded-2xl border px-4 py-3 text-left transition focus:outline-none',
                        isSelected
                          ? 'border-orange-500 bg-orange-500/10 text-white'
                          : 'border-white/5 text-[#c9d1d9] hover:border-orange-400/60 hover:bg-orange-500/5',
                        disabled && 'cursor-not-allowed opacity-40'
                      )}
                    >
                      <p className="text-sm font-semibold">{model.displayName}</p>
                      <p className="text-xs text-[#8b949e]">{model.description}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedModels(suggestedModels)}
              >
                Reset
              </Button>
              <Button
                onClick={handleRunComparison}
                disabled={selectedModels.length !== 2}
                className="bg-orange-500 hover:bg-orange-600"
              >
                Run comparison
              </Button>
            </div>

            <div className="rounded-2xl border border-white/5 bg-[#05080d] p-4">
              <p className="text-sm font-semibold text-white mb-3">Results</p>
              {renderResultBody()}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
