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
    // Citation metadata
    citation: {
        documentName: string;
        pageNumber?: number;
        sectionTitle?: string;
        snippet: string;
        relevanceScore: number;
        matchType: 'semantic' | 'keyword' | 'hybrid';
    };
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
    exactPhraseMatch: boolean;
}

/**
 * BM25-based scoring for text similarity
 * Returns both score and whether an exact phrase match was found
 */
function calculateSimilarity(query: string, text: string): { score: number; phraseMatch: boolean } {
    const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    const textLower = text.toLowerCase();
    const textWords = textLower.split(/\s+/);
    const avgDocLength = 500; // Approximate average document length

    if (queryWords.length === 0) return { score: 0, phraseMatch: false };

    // BM25 parameters
    const k1 = 1.5; // Term frequency saturation
    const b = 0.75; // Length normalization

    let score = 0;
    let matchedWords = 0;

    for (const word of queryWords) {
        // Count term frequency in document
        const regex = new RegExp(`\\b${escapeRegex(word)}\\b`, 'gi');
        const matches = textLower.match(regex);
        const tf = matches ? matches.length : 0;

        if (tf > 0) {
            matchedWords++;
            // BM25 term frequency component
            const lengthNorm = 1 - b + b * (textWords.length / avgDocLength);
            const tfNorm = (tf * (k1 + 1)) / (tf + k1 * lengthNorm);

            // Simple IDF approximation (assume query terms are relatively rare)
            const idf = Math.log(1 + 1 / (0.5 + tf / textWords.length));

            score += tfNorm * idf;
        }
    }

    // Boost score based on query coverage
    const coverage = matchedWords / queryWords.length;
    score *= (1 + coverage);

    // Check for exact phrase match (strong signal)
    const queryPhrase = queryWords.join(' ');
    const phraseMatch = textLower.includes(queryPhrase);
    if (phraseMatch) {
        score *= 2.5; // Strong boost for exact phrase
    }

    // N-gram matching (bigrams for partial phrase matching)
    for (let i = 0; i < queryWords.length - 1; i++) {
        const bigram = queryWords[i] + ' ' + queryWords[i + 1];
        if (textLower.includes(bigram)) {
            score *= 1.3; // Moderate boost for bigram matches
        }
    }

    return { score, phraseMatch };
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

            // Calculate query characteristics for dynamic weighting
            const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
            const isShortQuery = queryWords.length <= 2;

            // Lexical search with BM25 scoring
            for (const doc of documents.values()) {
                for (const chunk of doc.chunks) {
                    const { score: lexicalScore, phraseMatch } = calculateSimilarity(query, chunk.content);

                    if (lexicalScore > 0) {
                        const chunkKey = `${doc.id}_${chunk.id}`;
                        const highlights = extractHighlights(query, chunk.content);

                        const match: IntermediateMatch = intermediate.get(chunkKey) || {
                            document: doc,
                            chunk,
                            lexicalScore: 0,
                            semanticScore: 0,
                            highlights,
                            exactPhraseMatch: false,
                        };

                        match.lexicalScore = Math.max(match.lexicalScore, lexicalScore);
                        match.exactPhraseMatch = match.exactPhraseMatch || phraseMatch;
                        match.highlights = match.highlights.length > 0 ? match.highlights : highlights;
                        intermediate.set(chunkKey, match);

                        if (match.lexicalScore > maxLexicalScore) {
                            maxLexicalScore = match.lexicalScore;
                        }
                    }
                }
            }

            // Semantic search with embeddings
            try {
                const embeddingStore = getEmbeddingStore();
                const semanticResults = await embeddingStore.searchAsync(query, topK * 3, 0.45);

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
                        exactPhraseMatch: false,
                    };

                    match.semanticScore = Math.max(match.semanticScore, result.score);
                    match.highlights = match.highlights.length > 0 ? match.highlights : highlights;
                    intermediate.set(chunkKey, match);
                }
            } catch (error) {
                console.warn('Semantic search failed, falling back to lexical only:', error);
            }

            // Dynamic weighting based on query characteristics
            // Short queries: favor keyword matching; Long queries: favor semantic
            const lexicalWeight = isShortQuery ? 0.6 : 0.35;
            const semanticWeight = isShortQuery ? 0.4 : 0.65;

            const ranked: DocumentMatch[] = Array.from(intermediate.values()).map(match => {
                const normalizedLexical = maxLexicalScore > 0 ? match.lexicalScore / maxLexicalScore : 0;

                // Determine match type for citation
                let matchType: 'semantic' | 'keyword' | 'hybrid' = 'hybrid';
                let combinedScore = 0;

                if (match.semanticScore > 0 && normalizedLexical > 0) {
                    combinedScore = (normalizedLexical * lexicalWeight + match.semanticScore * semanticWeight);
                    matchType = 'hybrid';
                } else if (match.semanticScore > 0) {
                    combinedScore = match.semanticScore;
                    matchType = 'semantic';
                } else {
                    combinedScore = normalizedLexical * 0.8; // Penalty for no semantic match
                    matchType = 'keyword';
                }

                // Boost for exact phrase matches
                if (match.exactPhraseMatch) {
                    combinedScore *= 1.3;
                }

                combinedScore *= getTierBoost(match.document.id);

                // Create snippet for citation (first ~150 chars with highlights if available)
                const snippet = match.highlights.length > 0
                    ? match.highlights[0].replace(/\*\*/g, '').replace(/\.\.\./g, '').trim()
                    : match.chunk.content.slice(0, 150) + '...';

                return {
                    document: match.document,
                    chunk: match.chunk,
                    score: combinedScore,
                    highlights: match.highlights,
                    citation: {
                        documentName: match.document.name,
                        pageNumber: match.chunk.pageNumber,
                        sectionTitle: match.chunk.sectionTitle,
                        snippet,
                        relevanceScore: Math.round(combinedScore * 100) / 100,
                        matchType,
                    },
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
