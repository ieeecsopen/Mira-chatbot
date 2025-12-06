/**
 * Lightweight feedback/logging layer for RAG interactions.
 * Persists the retrieval metadata locally so we can analyze
 * which documents or plans were surfaced and how users rated them.
 */

import type { HopResult } from './ragOrchestrator';

export interface RetrievalFeedbackEntry {
    id: string;
    query: string;
    timestamp: number;
    ragUsed: boolean;
    sources: string[];
    model?: string;
    answerPreview?: string;
    hops?: Array<{
        type: HopResult['type'];
        query: string;
        documents: string[];
    }>;
    rating?: 'up' | 'down';
    notes?: string;
}

export interface FeedbackInput {
    query: string;
    ragUsed: boolean;
    sources: string[];
    answer?: string;
    model?: string;
    hops?: HopResult[];
}

const STORAGE_KEY = 'mira-rag-feedback';
const MAX_ENTRIES = 100;
const hasStorage = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

function generateId(): string {
    return `feedback_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function loadEntries(): RetrievalFeedbackEntry[] {
    if (!hasStorage) return [];
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        return JSON.parse(raw) as RetrievalFeedbackEntry[];
    } catch (error) {
        console.warn('Failed to load RAG feedback entries:', error);
        return [];
    }
}

function persistEntries(entries: RetrievalFeedbackEntry[]): void {
    if (!hasStorage) return;
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    } catch (error) {
        console.warn('Failed to persist RAG feedback entries:', error);
    }
}

function summarizeHops(hops?: HopResult[]): RetrievalFeedbackEntry['hops'] {
    if (!hops) return undefined;
    return hops.map(hop => ({
        type: hop.type,
        query: hop.query,
        documents: hop.matches.map(match => match.document.name),
    }));
}

export function recordRetrievalFeedback(input: FeedbackInput): string {
    const entries = loadEntries();
    const entry: RetrievalFeedbackEntry = {
        id: generateId(),
        query: input.query,
        timestamp: Date.now(),
        ragUsed: input.ragUsed,
        sources: Array.from(new Set(input.sources)),
        model: input.model,
        answerPreview: input.answer ? input.answer.slice(0, 400) : undefined,
        hops: summarizeHops(input.hops),
    };

    entries.unshift(entry);
    if (entries.length > MAX_ENTRIES) {
        entries.length = MAX_ENTRIES;
    }

    persistEntries(entries);
    return entry.id;
}

export function updateRetrievalFeedback(id: string, rating?: 'up' | 'down', notes?: string): void {
    const entries = loadEntries();
    const target = entries.find(entry => entry.id === id);
    if (!target) return;

    if (rating) target.rating = rating;
    if (notes !== undefined) target.notes = notes;

    persistEntries(entries);
}

export function getRecentRetrievalFeedback(limit = 20): RetrievalFeedbackEntry[] {
    const entries = loadEntries();
    return entries.slice(0, limit);
}

export function clearRetrievalFeedback(): void {
    if (!hasStorage) return;
    try {
        localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
        console.warn('Failed to clear RAG feedback entries:', error);
    }
}
