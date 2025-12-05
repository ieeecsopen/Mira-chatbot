/**
 * Text Embeddings and Vector Similarity for MIRA
 * Provides semantic search using TF-IDF based embeddings
 * (Browser-compatible alternative to external embedding APIs)
 */

const EMBEDDINGS_CACHE_KEY = 'mira-embeddings-cache';

export interface TextEmbedding {
    id: string;
    text: string;
    vector: number[];
    createdAt: number;
}

export interface EmbeddingCache {
    embeddings: TextEmbedding[];
    vocabulary: string[];
    idf: Record<string, number>;
    version: number;
}

/**
 * Tokenize text into words (handles both English and Sinhala)
 */
function tokenize(text: string): string[] {
    // Split on whitespace and punctuation, filter empty
    return text
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s]/gu, ' ')
        .split(/\s+/)
        .filter(word => word.length > 1);
}

/**
 * Calculate Term Frequency (TF)
 */
function calculateTF(tokens: string[]): Record<string, number> {
    const tf: Record<string, number> = {};
    const totalTokens = tokens.length;

    for (const token of tokens) {
        tf[token] = (tf[token] || 0) + 1;
    }

    // Normalize by total tokens
    for (const token in tf) {
        tf[token] = tf[token] / totalTokens;
    }

    return tf;
}

/**
 * Calculate Inverse Document Frequency (IDF)
 */
function calculateIDF(documents: string[][]): Record<string, number> {
    const idf: Record<string, number> = {};
    const numDocs = documents.length;

    // Count document frequency for each term
    const docFreq: Record<string, number> = {};
    for (const doc of documents) {
        const uniqueTokens = new Set(doc);
        for (const token of uniqueTokens) {
            docFreq[token] = (docFreq[token] || 0) + 1;
        }
    }

    // Calculate IDF with smoothing
    for (const token in docFreq) {
        idf[token] = Math.log((numDocs + 1) / (docFreq[token] + 1)) + 1;
    }

    return idf;
}

/**
 * Create TF-IDF vector for text
 */
function createTFIDFVector(
    text: string,
    vocabulary: string[],
    idf: Record<string, number>
): number[] {
    const tokens = tokenize(text);
    const tf = calculateTF(tokens);

    const vector: number[] = [];
    for (const term of vocabulary) {
        const tfidf = (tf[term] || 0) * (idf[term] || 0);
        vector.push(tfidf);
    }

    return normalizeVector(vector);
}

/**
 * Normalize a vector to unit length
 */
function normalizeVector(vector: number[]): number[] {
    const magnitude = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
    if (magnitude === 0) return vector;
    return vector.map(v => v / magnitude);
}

/**
 * Calculate cosine similarity between two vectors
 */
export function cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;

    let dotProduct = 0;
    for (let i = 0; i < a.length; i++) {
        dotProduct += a[i] * b[i];
    }

    return dotProduct; // Vectors are already normalized
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
        if (stored && stored.version === 1) {
            this.cache = stored;
        } else {
            this.cache = {
                embeddings: [],
                vocabulary: [],
                idf: {},
                version: 1,
            };
        }
    }

    /**
     * Build vocabulary and IDF from all documents
     */
    private rebuildVocabulary(): void {
        const allTokens = this.cache.embeddings.flatMap(e => tokenize(e.text));
        this.cache.vocabulary = [...new Set(allTokens)].slice(0, 1000); // Limit vocabulary size

        const documents = this.cache.embeddings.map(e => tokenize(e.text));
        this.cache.idf = calculateIDF(documents);

        // Rebuild all vectors with new vocabulary
        for (const embedding of this.cache.embeddings) {
            embedding.vector = createTFIDFVector(embedding.text, this.cache.vocabulary, this.cache.idf);
        }

        saveCache(this.cache);
    }

    /**
     * Add a text to the embedding store
     */
    add(id: string, text: string): TextEmbedding {
        // Check if already exists
        const existing = this.cache.embeddings.find(e => e.id === id);
        if (existing) {
            existing.text = text;
            this.rebuildVocabulary();
            return existing;
        }

        const embedding: TextEmbedding = {
            id,
            text,
            vector: [],
            createdAt: Date.now(),
        };

        this.cache.embeddings.push(embedding);
        this.rebuildVocabulary();

        return embedding;
    }

    /**
     * Add multiple texts at once (more efficient)
     */
    addBatch(items: Array<{ id: string; text: string }>): void {
        for (const { id, text } of items) {
            const existing = this.cache.embeddings.find(e => e.id === id);
            if (existing) {
                existing.text = text;
            } else {
                this.cache.embeddings.push({
                    id,
                    text,
                    vector: [],
                    createdAt: Date.now(),
                });
            }
        }
        this.rebuildVocabulary();
    }

    /**
     * Search for similar texts
     */
    search(query: string, limit: number = 5, minScore: number = 0.1): Array<{
        id: string;
        text: string;
        score: number;
    }> {
        if (this.cache.embeddings.length === 0 || this.cache.vocabulary.length === 0) {
            return [];
        }

        const queryVector = createTFIDFVector(query, this.cache.vocabulary, this.cache.idf);

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
    }

    /**
     * Get similar texts to an existing embedding
     */
    getSimilar(id: string, limit: number = 5): Array<{
        id: string;
        text: string;
        score: number;
    }> {
        const embedding = this.cache.embeddings.find(e => e.id === id);
        if (!embedding) return [];

        return this.cache.embeddings
            .filter(e => e.id !== id)
            .map(e => ({
                id: e.id,
                text: e.text,
                score: cosineSimilarity(embedding.vector, e.vector),
            }))
            .sort((a, b) => b.score - a.score)
            .slice(0, limit);
    }

    /**
     * Remove an embedding
     */
    remove(id: string): boolean {
        const index = this.cache.embeddings.findIndex(e => e.id === id);
        if (index !== -1) {
            this.cache.embeddings.splice(index, 1);
            this.rebuildVocabulary();
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
            vocabulary: [],
            idf: {},
            version: 1,
        };
        saveCache(this.cache);
    }

    /**
     * Get all embeddings
     */
    getAll(): TextEmbedding[] {
        return this.cache.embeddings;
    }

    /**
     * Get stats
     */
    getStats(): { count: number; vocabularySize: number } {
        return {
            count: this.cache.embeddings.length,
            vocabularySize: this.cache.vocabulary.length,
        };
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

/**
 * Quick semantic search
 */
export function semanticSearch(
    query: string,
    limit: number = 5
): Array<{ id: string; text: string; score: number }> {
    return getEmbeddingStore().search(query, limit);
}
