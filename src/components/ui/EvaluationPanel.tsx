import { AnimatePresence, motion } from 'framer-motion';
import {
  BarChart3,
  CheckCircle2,
  Clock,
  Download,
  MinusSquare,
  RefreshCw,
  ThumbsDown,
  ThumbsUp,
  TriangleAlert,
  X,
} from 'lucide-react';
import { useMemo } from 'react';
import { Button } from './button';
import { useMetrics } from '../../contexts/MetricsContext';

interface EvaluationPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

function formatLatency(ms?: number): string {
  if (typeof ms !== 'number' || Number.isNaN(ms)) {
    return '—';
  }
  if (ms < 1000) {
    return `${Math.round(ms)} ms`;
  }
  return `${(ms / 1000).toFixed(2)} s`;
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString();
}

export function EvaluationPanel({ isOpen, onClose }: EvaluationPanelProps) {
  const { records, summary, clear } = useMetrics();

  const recentRecords = useMemo(() => {
    return [...records]
      .filter((record) => record.completedAt)
      .sort((a, b) => (b.completedAt ?? b.startedAt) - (a.completedAt ?? a.startedAt))
      .slice(0, 15);
  }, [records]);

  const successRatePercent = Math.round(summary.successRate * 100);

  const handleClear = () => {
    if (confirm('Clear analytics history? This cannot be undone.')) {
      clear();
    }
  };

  const handleExport = () => {
    if (!records.length) {
      return;
    }
    const header = [
      'id',
      'prompt',
      'model',
      'startedAt',
      'completedAt',
      'latencyMs',
      'success',
      'error',
      'rating',
      'feedback',
      'usedWebSearch',
      'usedDocuments',
      'responseStyle',
      'attachmentsCount',
      'userMessageChars',
    ];
    const rows = records.map((record) =>
      header
        .map((key) => {
          const value = (record as Record<string, unknown>)[key];
          if (value == null) {
            return '';
          }
          if (typeof value === 'string') {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return String(value);
        })
        .join(','),
    );
    const csv = [header.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `mira-analytics-${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-xl z-50"
          >
            <div className="h-full bg-[#0d1117] border-l border-[#30363d] flex flex-col">
              <div className="flex items-center justify-between px-5 py-4 border-b border-[#30363d]">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-500/10">
                    <BarChart3 size={20} className="text-emerald-300" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-white">Analytics</h2>
                    <p className="text-sm text-[#8b949e]">
                      {summary.totalResponses} evaluated responses
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleExport()}
                    disabled={!records.length}
                    className="text-[#8b949e] hover:text-white"
                  >
                    <Download size={18} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleClear}
                    disabled={!records.length}
                    className="text-[#8b949e] hover:text-red-400"
                  >
                    <RefreshCw size={18} />
                  </Button>
                  <button
                    onClick={onClose}
                    className="p-2 rounded-lg text-[#8b949e] hover:text-white hover:bg-white/5 transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 p-4 border-b border-[#30363d] bg-[#0f141b]">
                <div className="rounded-xl border border-white/5 bg-white/5 p-4 flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-sm text-[#8b949e]">
                    <CheckCircle2 size={16} className="text-emerald-300" />
                    Success rate
                  </div>
                  <p className="text-3xl font-semibold text-white">{successRatePercent}%</p>
                  <span className="text-xs text-[#6e7681]">
                    {summary.runningResponses > 0
                      ? `${summary.runningResponses} responses in progress`
                      : 'All caught up'}
                  </span>
                </div>

                <div className="rounded-xl border border-white/5 bg-white/5 p-4 flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-sm text-[#8b949e]">
                    <Clock size={16} className="text-orange-300" />
                    Average latency
                  </div>
                  <p className="text-3xl font-semibold text-white">{formatLatency(summary.avgLatencyMs)}</p>
                  <span className="text-xs text-[#6e7681]">P95 {formatLatency(summary.p95LatencyMs)}</span>
                </div>

                <div className="rounded-xl border border-white/5 bg-white/5 p-4 flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-sm text-[#8b949e]">
                    <ThumbsUp size={16} className="text-sky-300" />
                    Positive ratings
                  </div>
                  <p className="text-3xl font-semibold text-white">{summary.positiveRatings}</p>
                  <span className="text-xs text-[#6e7681]">{summary.unrated} unrated</span>
                </div>

                <div className="rounded-xl border border-white/5 bg-white/5 p-4 flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-sm text-[#8b949e]">
                    <ThumbsDown size={16} className="text-red-300" />
                    Negative ratings
                  </div>
                  <p className="text-3xl font-semibold text-white">{summary.negativeRatings}</p>
                  <span className="text-xs text-[#6e7681]">
                    {summary.errorCount} errors captured
                  </span>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                {recentRecords.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center gap-3 text-[#6e7681]">
                    <MinusSquare size={32} />
                    <p>No responses evaluated yet</p>
                    <p className="text-xs text-[#4f5865] text-center max-w-xs">
                      Start a conversation to populate latency, error and rating metrics automatically.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {summary.lastError && (
                      <div className="border border-red-500/30 bg-red-500/10 rounded-lg p-3 text-sm text-red-200 flex items-start gap-2">
                        <TriangleAlert size={16} className="mt-0.5" />
                        <div>
                          <p className="font-medium">Latest error</p>
                          <p className="text-red-300">{summary.lastError.message}</p>
                          <p className="text-xs text-red-200/70 mt-1">
                            {formatDate(summary.lastError.at)}
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="space-y-2">
                      {recentRecords.map((record) => (
                        <div
                          key={record.id}
                          className="rounded-lg border border-[#30363d] bg-[#111721] p-3 text-sm text-[#c9d1d9]"
                        >
                          <div className="flex items-center justify-between gap-2 text-xs text-[#6e7681] mb-2">
                            <span>{formatDate(record.completedAt ?? record.startedAt)}</span>
                            <span className="uppercase tracking-wide">
                              {record.success ? 'SUCCESS' : 'ERROR'}
                            </span>
                          </div>
                          <p className="text-sm text-white line-clamp-2" title={record.prompt}>
                            {record.prompt || '—'}
                          </p>
                          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-[#8b949e]">
                            <span>Latency {formatLatency(record.latencyMs)}</span>
                            {record.model && <span>Model {record.model}</span>}
                            {typeof record.rating !== 'undefined' && (
                              <span>
                                Rating {record.rating === 'up' ? '👍' : '👎'}
                              </span>
                            )}
                            {record.error && (
                              <span className="text-red-300">{record.error}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
