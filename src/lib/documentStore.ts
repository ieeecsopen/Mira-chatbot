/**
 * Document Store Module
 * Stores parsed documents and provides semantic search capabilities
 */

import type { ParsedDocument, DocumentChunk } from './documentParser';
import { getEmbeddingStore } from './embeddings';
import { getTierBoost, registerDocumentAccess } from './memoryTiers';

export interface DocumentMatch {
    document: ParsedDocument;
    chunk: DocumentChunk;
    score: number;
    highlights: string[];
}

export interface DocumentStore {
    documents: Map<string, ParsedDocument>;
    addAsync: (doc: ParsedDocument) => Promise<void>;
    remove: (docId: string) => void;
    get: (docId: string) => ParsedDocument | undefined;
    getAll: () => ParsedDocument[];
    searchAsync: (query: string, topK?: number) => Promise<DocumentMatch[]>;
    clear: () => void;
    getContextForQueryAsync: (query: string, maxTokens?: number) => Promise<string>;
}

interface IntermediateMatch {
    document: ParsedDocument;
    chunk: DocumentChunk;
    lexicalScore: number;
    semanticScore: number;
    highlights: string[];
}

/**
 * Simple TF-IDF like scoring for text similarity
 */
function calculateSimilarity(query: string, text: string): number {
    const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    const textLower = text.toLowerCase();

    if (queryWords.length === 0) return 0;

    let score = 0;
    let matchedWords = 0;

    for (const word of queryWords) {
        // Exact word match
        const regex = new RegExp(`\\b${escapeRegex(word)}\\b`, 'gi');
        const matches = textLower.match(regex);

        if (matches) {
            matchedWords++;
            // Score based on frequency and inverse document length
            score += (matches.length * 10) / Math.log(text.length + 1);
        }

        // Partial match (for longer words)
        if (word.length > 4 && textLower.includes(word)) {
            score += 2;
        }
    }

    // Boost score if most query words matched
    const coverage = matchedWords / queryWords.length;
    score *= (1 + coverage);

    // Bonus for phrase match
    const queryPhrase = queryWords.join(' ');
    if (textLower.includes(queryPhrase)) {
        score *= 2;
    }

    return score;
}

/**
 * Escape special regex characters
 */
function escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Extract highlighted snippets around matched terms
 */
function extractHighlights(query: string, text: string, _maxLength = 150): string[] {
    const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    const highlights: string[] = [];

    for (const word of queryWords) {
        const regex = new RegExp(`(.{0,50})(${escapeRegex(word)})(.{0,50})`, 'gi');
        let match;

        while ((match = regex.exec(text)) !== null && highlights.length < 3) {
            const highlight = `...${match[1]}**${match[2]}**${match[3]}...`;
            if (!highlights.includes(highlight)) {
                highlights.push(highlight);
            }
        }
    }

    return highlights.slice(0, 3);
}

function resolveChunkFromKey(key: string, docs: Map<string, ParsedDocument>): { document: ParsedDocument; chunk: DocumentChunk } | null {
    const marker = '_chunk_';
    const markerIndex = key.indexOf(marker);
    if (markerIndex === -1) {
        return null;
    }

    const docId = key.slice(0, markerIndex);
    const chunkId = key.slice(markerIndex + 1);

    const document = docs.get(docId);
    if (!document) {
        return null;
    }

    const chunk = document.chunks.find(c => c.id === chunkId);
    if (!chunk) {
        return null;
    }

    return { document, chunk };
}

/**
 * Create a document store instance
 */
export function createDocumentStore(): DocumentStore {
    const documents = new Map<string, ParsedDocument>();

    return {
        documents,

        async addAsync(doc: ParsedDocument) {
            documents.set(doc.id, doc);
            console.log(`📄 Document added: ${doc.name} (${doc.chunks.length} chunks)`);

            // Add chunks to embedding store for semantic search
            try {
                const embeddingStore = getEmbeddingStore();
                const items = doc.chunks.map(chunk => ({
                    id: `${doc.id}_${chunk.id}`,
                    text: chunk.content,
                }));
                await embeddingStore.addBatchAsync(items);
                console.log(`🧠 Indexed ${items.length} chunks for semantic search`);
            } catch (e) {
                console.warn('Failed to index document for semantic search:', e);
            }
        },

        remove(docId: string) {
            const doc = documents.get(docId);
            if (doc) {
                documents.delete(docId);
                console.log(`🗑️ Document removed: ${doc.name}`);

                // Remove from embedding store
                try {
                    const embeddingStore = getEmbeddingStore();
                    for (const chunk of doc.chunks) {
                        embeddingStore.remove(`${docId}_${chunk.id}`);
                    }
                } catch (e) {
                    console.warn('Failed to remove document embeddings:', e);
                }
            }
        },

        get(docId: string) {
            return documents.get(docId);
        },

        getAll() {
            return Array.from(documents.values());
        },

        async searchAsync(query: string, topK = 5): Promise<DocumentMatch[]> {
            const intermediate = new Map<string, IntermediateMatch>();
            let maxLexicalScore = 0;

            // TODO: optimize lexical search to run in worker or be faster?
            // For now, it's fast enough for small documents
            for (const doc of documents.values()) {
                for (const chunk of doc.chunks) {
                    const lexicalScore = calculateSimilarity(query, chunk.content);

                    if (lexicalScore > 0) {
                        const chunkKey = `${doc.id}_${chunk.id}`;
                        const highlights = extractHighlights(query, chunk.content);

                        const match: IntermediateMatch = intermediate.get(chunkKey) || {
                            document: doc,
                            chunk,
                            lexicalScore: 0,
                            semanticScore: 0,
                            highlights,
                        };

                        match.lexicalScore = Math.max(match.lexicalScore, lexicalScore);
                        match.highlights = match.highlights.length > 0 ? match.highlights : highlights;
                        intermediate.set(chunkKey, match);

                        if (match.lexicalScore > maxLexicalScore) {
                            maxLexicalScore = match.lexicalScore;
                        }
                    }
                }
            }

            try {
                const embeddingStore = getEmbeddingStore();
                const semanticResults = await embeddingStore.searchAsync(query, topK * 3, 0.45); // Higher threshold for real embeddings

                for (const result of semanticResults) {
                    const resolved = resolveChunkFromKey(result.id, documents);
                    if (!resolved) continue;
                    const chunkKey = result.id;
                    const highlights = extractHighlights(query, resolved.chunk.content);

                    const match: IntermediateMatch = intermediate.get(chunkKey) || {
                        document: resolved.document,
                        chunk: resolved.chunk,
                        lexicalScore: 0,
                        semanticScore: 0,
                        highlights,
                    };

                    match.semanticScore = Math.max(match.semanticScore, result.score);
                    match.highlights = match.highlights.length > 0 ? match.highlights : highlights;
                    intermediate.set(chunkKey, match);
                }
            } catch (error) {
                console.warn('Semantic search failed, falling back to lexical only:', error);
            }

            const lexicalWeight = 0.4;
            const semanticWeight = 0.6; // Give more weight to semantic search with real embeddings

            const ranked: DocumentMatch[] = Array.from(intermediate.values()).map(match => {
                const normalizedLexical = maxLexicalScore > 0 ? match.lexicalScore / maxLexicalScore : 0;

                // If only one score is present, use it directly (dampened)
                let combinedScore = 0;

                if (match.semanticScore > 0 && normalizedLexical > 0) {
                    combinedScore = (normalizedLexical * lexicalWeight + match.semanticScore * semanticWeight);
                } else if (match.semanticScore > 0) {
                    combinedScore = match.semanticScore;
                } else {
                    combinedScore = normalizedLexical * 0.8; // Penalty for no semantic match
                }

                combinedScore *= getTierBoost(match.document.id);

                return {
                    document: match.document,
                    chunk: match.chunk,
                    score: combinedScore,
                    highlights: match.highlights,
                };
            });

            ranked.sort((a, b) => b.score - a.score);

            const topResults = ranked.slice(0, topK);
            const touched = new Set<string>();
            for (const match of topResults) {
                if (touched.has(match.document.id)) continue;
                registerDocumentAccess(match.document.id);
                touched.add(match.document.id);
            }

            return topResults;
        },

        clear() {
            documents.clear();
            console.log('🗑️ Document store cleared');
        },

        async getContextForQueryAsync(query: string, maxTokens = 2000): Promise<string> {
            const matches = await this.searchAsync(query, 10);

            if (matches.length === 0) {
                return '';
            }

            let context = '### Relevant Document Context:\n\n';
            let tokenCount = 0;
            const usedChunks = new Set<string>();

            for (const match of matches) {
                const chunkKey = `${match.document.id}_${match.chunk.id}`;
                if (usedChunks.has(chunkKey)) continue;
                usedChunks.add(chunkKey);

                // Rough token estimation (1 token ≈ 4 characters)
                const chunkTokens = Math.ceil(match.chunk.content.length / 4);

                if (tokenCount + chunkTokens > maxTokens) {
                    // Add truncated version
                    const remainingTokens = maxTokens - tokenCount;
                    const remainingChars = remainingTokens * 4;
                    if (remainingChars > 100) {
                        context += `**From: ${match.document.name}**\n`;
                        context += match.chunk.content.slice(0, remainingChars) + '...\n\n';
                    }
                    break;
                }

                context += `**From: ${match.document.name}`;
                if (match.chunk.pageNumber) {
                    context += ` (Page ${match.chunk.pageNumber})`;
                }
                context += '**\n';
                context += match.chunk.content + '\n\n';

                tokenCount += chunkTokens;
            }

            context += '\n**Instructions:** Use the above document context to answer the user\'s question. If the information is not in the documents, say so clearly.\n';

            return context;
        },
    };
}

// Global document store instance
let globalStore: DocumentStore | null = null;

/**
 * Get or create the global document store
 */
export function getDocumentStore(): DocumentStore {
    if (!globalStore) {
        globalStore = createDocumentStore();
    }
    return globalStore;
}

/**
 * Save documents to localStorage for persistence
 */
export function persistDocuments(store: DocumentStore): void {
    try {
        const docs = store.getAll();
        const serialized = JSON.stringify(docs);
        localStorage.setItem('mira_documents', serialized);
        console.log(`💾 Saved ${docs.length} documents to storage`);
    } catch (error) {
        console.error('Failed to persist documents:', error);
    }
}

/**
 * Load documents from localStorage
 */
export async function loadPersistedDocuments(store: DocumentStore): Promise<void> {
    try {
        const serialized = localStorage.getItem('mira_documents');
        if (serialized) {
            const docs: ParsedDocument[] = JSON.parse(serialized);
            for (const doc of docs) {
                await store.addAsync(doc);
            }
            console.log(`📂 Loaded ${docs.length} documents from storage`);
        }
    } catch (error) {
        console.error('Failed to load persisted documents:', error);
    }
}
