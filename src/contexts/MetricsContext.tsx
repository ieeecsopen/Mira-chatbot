import { createContext, useContext, useState, useMemo, useCallback, useEffect, type ReactNode } from 'react';

const STORAGE_KEY = 'mira-metrics-v1';
const MAX_RECORDS = 300;

type RatingValue = 'up' | 'down';

export interface MetricsRecord {
  id: string;
  sessionId?: string;
  prompt: string;
  model?: string;
  startedAt: number;
  completedAt?: number;
  latencyMs?: number;
  success?: boolean;
  error?: string;
  rating?: RatingValue;
  feedback?: string;
  usedWebSearch?: boolean;
  usedDocuments?: boolean;
  responseStyle?: 'concise' | 'detailed';
  attachmentsCount?: number;
  userMessageChars?: number;
}

export interface MetricsSummary {
  totalResponses: number;
  successRate: number;
  avgLatencyMs: number;
  p95LatencyMs: number;
  positiveRatings: number;
  negativeRatings: number;
  unrated: number;
  errorCount: number;
  runningResponses: number;
  lastError?: { message: string; at: number };
  lastUpdated?: number;
}

interface MetricsContextValue {
  records: MetricsRecord[];
  summary: MetricsSummary;
  startResponse: (
    record: Omit<MetricsRecord, 'completedAt' | 'latencyMs' | 'success' | 'error' | 'rating' | 'feedback'> & {
      startedAt?: number;
    },
  ) => void;
  completeResponse: (id: string, result: { success: boolean; latencyMs?: number; error?: string; completedAt?: number; model?: string }) => void;
  setRating: (id: string, rating: RatingValue | null, feedback?: string) => void;
  clear: () => void;
  getRecord: (id: string) => MetricsRecord | undefined;
}

const MetricsContext = createContext<MetricsContextValue | undefined>(undefined);

function loadInitialRecords(): MetricsRecord[] {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return [];
    }
    const parsed = JSON.parse(stored) as MetricsRecord[];
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.slice(-MAX_RECORDS);
  } catch (error) {
    console.warn('Failed to parse metrics storage', error);
    return [];
  }
}

export function MetricsProvider({ children }: { children: ReactNode }) {
  const [records, setRecords] = useState<MetricsRecord[]>(loadInitialRecords);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records.slice(-MAX_RECORDS)));
    } catch (error) {
      console.warn('Failed to persist metrics', error);
    }
  }, [records]);

  const startResponse = useCallback<MetricsContextValue['startResponse']>((record) => {
    setRecords((prev) => {
      const filtered = prev.filter((existing) => existing.id !== record.id);
      const nextRecord: MetricsRecord = {
        ...record,
        startedAt: record.startedAt ?? Date.now(),
      };
      return [...filtered, nextRecord].slice(-MAX_RECORDS);
    });
  }, []);

  const completeResponse = useCallback<MetricsContextValue['completeResponse']>((id, result) => {
    setRecords((prev) => {
      let found = false;
      const updated = prev.map((record) => {
        if (record.id !== id) {
          return record;
        }
        found = true;
        return {
          ...record,
          completedAt: result.completedAt ?? Date.now(),
          latencyMs: result.latencyMs,
          success: result.success,
          error: result.error,
          model: result.model ?? record.model,
        };
      });

      if (!found) {
        const fallbackRecord: MetricsRecord = {
          id,
          prompt: 'unknown',
          startedAt: Date.now(),
          completedAt: result.completedAt ?? Date.now(),
          latencyMs: result.latencyMs,
          success: result.success,
          error: result.error,
          model: result.model,
        };
        return [...updated, fallbackRecord].slice(-MAX_RECORDS);
      }

      return updated;
    });
  }, []);

  const setRating = useCallback<MetricsContextValue['setRating']>((id, rating, feedback) => {
    setRecords((prev) =>
      prev.map((record) =>
        record.id === id
          ? {
              ...record,
              rating: rating ?? undefined,
              feedback: feedback ?? record.feedback,
            }
          : record,
      ),
    );
  }, []);

  const clear = useCallback(() => {
    setRecords([]);
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const getRecord = useCallback((id: string) => records.find((record) => record.id === id), [records]);

  const summary = useMemo<MetricsSummary>(() => {
    const completed = records.filter((record) => typeof record.completedAt === 'number');
    const totalResponses = completed.length;
    const successCount = completed.filter((record) => record.success).length;
    const errorRecords = completed.filter((record) => record.success === false);
    const latencies = completed
      .map((record) => record.latencyMs)
      .filter((latency): latency is number => typeof latency === 'number' && latency >= 0);

    const avgLatency = latencies.length
      ? latencies.reduce((sum, value) => sum + value, 0) / latencies.length
      : 0;

    const sortedLatencies = latencies.length ? [...latencies].sort((a, b) => a - b) : [];
    const p95Latency = sortedLatencies.length
      ? sortedLatencies[Math.min(sortedLatencies.length - 1, Math.floor(sortedLatencies.length * 0.95))]
      : 0;

    const positiveRatings = completed.filter((record) => record.rating === 'up').length;
    const negativeRatings = completed.filter((record) => record.rating === 'down').length;
    const unrated = completed.filter((record) => !record.rating).length;
    const runningResponses = records.filter((record) => typeof record.completedAt !== 'number').length;

    const lastErrorRecord = errorRecords.reduce<{ message: string; at: number } | undefined>((latest, record) => {
      const at = record.completedAt ?? record.startedAt;
      if (!latest || at > latest.at) {
        return { message: record.error ?? 'Unknown error', at };
      }
      return latest;
    }, undefined);

    const lastUpdated = records.length
      ? Math.max(...records.map((record) => record.completedAt ?? record.startedAt))
      : undefined;

    return {
      totalResponses,
      successRate: totalResponses ? successCount / totalResponses : 0,
      avgLatencyMs: avgLatency,
      p95LatencyMs: p95Latency,
      positiveRatings,
      negativeRatings,
      unrated,
      errorCount: errorRecords.length,
      runningResponses,
      lastError: lastErrorRecord,
      lastUpdated,
    };
  }, [records]);

  const value = useMemo<MetricsContextValue>(
    () => ({ records, summary, startResponse, completeResponse, setRating, clear, getRecord }),
    [records, summary, startResponse, completeResponse, setRating, clear, getRecord],
  );

  return <MetricsContext.Provider value={value}>{children}</MetricsContext.Provider>;
}

export function useMetrics(): MetricsContextValue {
  const context = useContext(MetricsContext);
  if (!context) {
    throw new Error('useMetrics must be used within a MetricsProvider');
  }
  return context;
}
