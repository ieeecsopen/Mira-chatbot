/**
 * Document Store Module
 * Stores parsed documents and provides semantic search capabilities
 */

import type { ParsedDocument, DocumentChunk } from './documentParser';
import { getEmbeddingStore } from './embeddings';

export interface DocumentMatch {
    document: ParsedDocument;
    chunk: DocumentChunk;
    score: number;
    highlights: string[];
}

export interface DocumentStore {
    documents: Map<string, ParsedDocument>;
    add: (doc: ParsedDocument) => void;
    remove: (docId: string) => void;
    get: (docId: string) => ParsedDocument | undefined;
    getAll: () => ParsedDocument[];
    search: (query: string, topK?: number) => DocumentMatch[];
    clear: () => void;
    getContextForQuery: (query: string, maxTokens?: number) => string;
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

/**
 * Create a document store instance
 */
export function createDocumentStore(): DocumentStore {
    const documents = new Map<string, ParsedDocument>();

    return {
        documents,

        add(doc: ParsedDocument) {
            documents.set(doc.id, doc);
            console.log(`📄 Document added: ${doc.name} (${doc.chunks.length} chunks)`);

            // Add chunks to embedding store for semantic search
            try {
                const embeddingStore = getEmbeddingStore();
                const items = doc.chunks.map(chunk => ({
                    id: `${doc.id}_${chunk.id}`,
                    text: chunk.content,
                }));
                embeddingStore.addBatch(items);
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

        search(query: string, topK = 5): DocumentMatch[] {
            const matches: DocumentMatch[] = [];

            for (const doc of documents.values()) {
                for (const chunk of doc.chunks) {
                    const score = calculateSimilarity(query, chunk.content);

                    if (score > 0) {
                        matches.push({
                            document: doc,
                            chunk,
                            score,
                            highlights: extractHighlights(query, chunk.content),
                        });
                    }
                }
            }

            // Sort by score descending
            matches.sort((a, b) => b.score - a.score);

            return matches.slice(0, topK);
        },

        clear() {
            documents.clear();
            console.log('🗑️ Document store cleared');
        },

        getContextForQuery(query: string, maxTokens = 2000): string {
            const matches = this.search(query, 10);

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
export function loadPersistedDocuments(store: DocumentStore): void {
    try {
        const serialized = localStorage.getItem('mira_documents');
        if (serialized) {
            const docs: ParsedDocument[] = JSON.parse(serialized);
            for (const doc of docs) {
                store.add(doc);
            }
            console.log(`📂 Loaded ${docs.length} documents from storage`);
        }
    } catch (error) {
        console.error('Failed to load persisted documents:', error);
    }
}
