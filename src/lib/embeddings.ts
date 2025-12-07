/**
 * Text Embeddings and Vector Similarity for MIRA
 * Uses Gemini API (via local proxy) for high-quality embeddings
 */

const EMBEDDINGS_CACHE_KEY = 'mira-embeddings-cache-v2';

export interface TextEmbedding {
    id: string;
    text: string;
    vector: number[];
    createdAt: number;
}

export interface EmbeddingCache {
    embeddings: TextEmbedding[];
    version: number;
}

/**
 * Calculate cosine similarity between two vectors
 */
export function cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
        dotProduct += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }

    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Fetch embedding from API
 */
async function fetchEmbedding(text: string, type: 'search_document' | 'search_query' = 'search_document'): Promise<number[]> {
    try {
        const response = await fetch('/api/embeddings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ text, type }),
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch embedding: ${response.statusText}`);
        }

        const data = await response.json();
        return data.embedding;
    } catch (error) {
        console.error('Embedding fetch error:', error);
        throw error;
    }
}

/**
 * Load embedding cache from localStorage
 */
function loadCache(): EmbeddingCache | null {
    try {
        const stored = localStorage.getItem(EMBEDDINGS_CACHE_KEY);
        if (stored) {
            return JSON.parse(stored);
        }
    } catch (e) {
        console.warn('Failed to load embeddings cache:', e);
    }
    return null;
}

/**
 * Save embedding cache to localStorage
 */
function saveCache(cache: EmbeddingCache): void {
    try {
        localStorage.setItem(EMBEDDINGS_CACHE_KEY, JSON.stringify(cache));
    } catch (e) {
        console.warn('Failed to save embeddings cache:', e);
    }
}

/**
 * Embedding Store Class
 */
class EmbeddingStore {
    private cache: EmbeddingCache;

    constructor() {
        const stored = loadCache();
        if (stored && stored.version === 2) {
            this.cache = stored;
        } else {
            this.cache = {
                embeddings: [],
                version: 2,
            };
        }
    }

    /**
     * Add a text to the embedding store (async)
     */
    async addAsync(id: string, text: string): Promise<TextEmbedding> {
        // Check if already exists
        const existing = this.cache.embeddings.find(e => e.id === id);
        if (existing) {
            // If text is different, update embedding
            if (existing.text !== text) {
                existing.text = text;
                existing.vector = await fetchEmbedding(text, 'search_document');
                saveCache(this.cache);
            }
            return existing;
        }

        const vector = await fetchEmbedding(text, 'search_document');

        const embedding: TextEmbedding = {
            id,
            text,
            vector,
            createdAt: Date.now(),
        };

        this.cache.embeddings.push(embedding);
        saveCache(this.cache);

        return embedding;
    }

    /**
     * Add multiple texts at once (async)
     */
    async addBatchAsync(items: Array<{ id: string; text: string }>): Promise<void> {
        const newItems = [];

        for (const { id, text } of items) {
            const existing = this.cache.embeddings.find(e => e.id === id);
            if (existing) {
                if (existing.text !== text) {
                    // Invalidate and re-fetch if text changed
                    existing.text = text;
                    // We'll queue for update
                    newItems.push({ item: existing, text });
                }
            } else {
                newItems.push({ id, text });
            }
        }

        // Process in parallel with concurrency limit
        const BATCH_SIZE = 5;
        for (let i = 0; i < newItems.length; i += BATCH_SIZE) {
            const batch = newItems.slice(i, i + BATCH_SIZE);
            await Promise.all(batch.map(async (item: any) => {
                try {
                    const vector = await fetchEmbedding(item.text, 'search_document');

                    if (item.item) {
                        // Updating existing
                        item.item.vector = vector;
                    } else {
                        // Creating new
                        this.cache.embeddings.push({
                            id: item.id,
                            text: item.text,
                            vector,
                            createdAt: Date.now()
                        });
                    }
                } catch (e) {
                    console.error(`Failed to process embedding for ${item.id || item.item.id}:`, e);
                }
            }));
        }

        saveCache(this.cache);
    }

    /**
     * Search for similar texts (async)
     */
    async searchAsync(query: string, limit: number = 5, minScore: number = 0.5): Promise<Array<{
        id: string;
        text: string;
        score: number;
    }>> {
        if (this.cache.embeddings.length === 0) {
            return [];
        }

        try {
            const queryVector = await fetchEmbedding(query, 'search_query');

            const results = this.cache.embeddings
                .map(embedding => ({
                    id: embedding.id,
                    text: embedding.text,
                    score: cosineSimilarity(queryVector, embedding.vector),
                }))
                .filter(r => r.score >= minScore)
                .sort((a, b) => b.score - a.score)
                .slice(0, limit);

            return results;
        } catch (e) {
            console.error('Search failed:', e);
            return [];
        }
    }

    /**
     * Remove an embedding
     */
    remove(id: string): boolean {
        const index = this.cache.embeddings.findIndex(e => e.id === id);
        if (index !== -1) {
            this.cache.embeddings.splice(index, 1);
            saveCache(this.cache);
            return true;
        }
        return false;
    }

    /**
     * Clear all embeddings
     */
    clear(): void {
        this.cache = {
            embeddings: [],
            version: 2,
        };
        saveCache(this.cache);
    }

    /**
     * Get all embeddings
     */
    getAll(): TextEmbedding[] {
        return this.cache.embeddings;
    }
}

// Singleton instance
let embeddingStore: EmbeddingStore | null = null;

/**
 * Get the embedding store instance
 */
export function getEmbeddingStore(): EmbeddingStore {
    if (!embeddingStore) {
        embeddingStore = new EmbeddingStore();
    }
    return embeddingStore;
}
