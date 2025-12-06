/**
 * Structured memory tiering for document recall.
 * Maintains hot/warm/cold buckets backed by localStorage so frequent
 * documents stay prioritized without bloating the working set.
 */

export type MemoryTier = 'hot' | 'warm' | 'cold';

interface TierEntry {
    tier: MemoryTier;
    accessCount: number;
    lastAccessed: number;
}

interface TierSnapshot extends TierEntry {
    id: string;
}

const STORAGE_KEY = 'mira-memory-tiers';
const hasStorage = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
const PROMOTION_BREAKPOINTS: Record<MemoryTier, number> = {
    cold: 3,
    warm: 8,
    hot: Infinity,
};

function now(): number {
    return Date.now();
}

function getDecayHours(lastAccessed: number): number {
    return (now() - lastAccessed) / 36e5;
}

class MemoryTierStore {
    private entries = new Map<string, TierEntry>();
    private hydrated = false;

    private hydrate(): void {
        if (this.hydrated) return;
        if (!hasStorage) {
            this.hydrated = true;
            return;
        }

        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                const parsed: Record<string, TierEntry> = JSON.parse(raw);
                for (const [id, value] of Object.entries(parsed)) {
                    this.entries.set(id, value);
                }
            }
        } catch (error) {
            console.warn('Failed to load memory tiers:', error);
        }
        this.hydrated = true;
    }

    private persist(): void {
        if (!hasStorage) return;

        try {
            const serializable: Record<string, TierEntry> = {};
            for (const [id, value] of this.entries.entries()) {
                serializable[id] = value;
            }
            localStorage.setItem(STORAGE_KEY, JSON.stringify(serializable));
        } catch (error) {
            console.warn('Failed to persist memory tiers:', error);
        }
    }

    private ensureEntry(id: string): TierEntry {
        this.hydrate();
        let entry = this.entries.get(id);
        if (!entry) {
            entry = { tier: 'cold', accessCount: 0, lastAccessed: now() };
            this.entries.set(id, entry);
        }
        return entry;
    }

    private applyDecay(entry: TierEntry): void {
        const hours = getDecayHours(entry.lastAccessed);
        if (hours > 24 && entry.accessCount < 2) {
            entry.tier = 'cold';
        } else if (hours > 6 && entry.tier === 'hot') {
            entry.tier = 'warm';
        }
    }

    private maybePromote(entry: TierEntry): void {
        if (entry.tier === 'hot') return;

        if (entry.tier === 'cold' && entry.accessCount >= PROMOTION_BREAKPOINTS.cold) {
            entry.tier = 'warm';
            entry.accessCount = Math.min(entry.accessCount, PROMOTION_BREAKPOINTS.warm - 1);
            return;
        }

        if (entry.tier === 'warm' && entry.accessCount >= PROMOTION_BREAKPOINTS.warm) {
            entry.tier = 'hot';
        }
    }

    touch(id: string): void {
        const entry = this.ensureEntry(id);
        this.applyDecay(entry);
        entry.accessCount += 1;
        entry.lastAccessed = now();
        this.maybePromote(entry);
        this.persist();
    }

    degradeCold(id: string): void {
        const entry = this.ensureEntry(id);
        entry.accessCount = Math.max(0, Math.floor(entry.accessCount / 2));
        this.applyDecay(entry);
        if (entry.accessCount === 0) {
            entry.tier = 'cold';
        }
        this.persist();
    }

    getTier(id: string): TierEntry {
        const entry = this.ensureEntry(id);
        this.applyDecay(entry);
        this.persist();
        return entry;
    }

    setTier(id: string, tier: MemoryTier): void {
        const entry = this.ensureEntry(id);
        entry.tier = tier;
        entry.accessCount = tier === 'hot' ? PROMOTION_BREAKPOINTS.warm : tier === 'warm' ? PROMOTION_BREAKPOINTS.cold : 0;
        entry.lastAccessed = now();
        this.persist();
    }

    snapshot(): TierSnapshot[] {
        this.hydrate();
        return Array.from(this.entries.entries()).map(([id, entry]) => ({
            id,
            ...entry,
        }));
    }
}

let store: MemoryTierStore | null = null;

function getStore(): MemoryTierStore {
    if (!store) {
        store = new MemoryTierStore();
    }
    return store;
}

export function registerDocumentAccess(docId: string): void {
    getStore().touch(docId);
}

export function manuallySetTier(docId: string, tier: MemoryTier): void {
    getStore().setTier(docId, tier);
}

export function getTierBoost(docId: string): number {
    const entry = getStore().getTier(docId);
    switch (entry.tier) {
        case 'hot':
            return 1.2;
        case 'warm':
            return 1.05;
        default:
            return 1;
    }
}

export function getTierSnapshot(): TierSnapshot[] {
    return getStore().snapshot();
}
