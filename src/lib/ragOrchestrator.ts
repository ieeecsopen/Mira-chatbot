/**
 * High-level orchestration for document-grounded RAG.
 * Combines query planning, multi-hop document retrieval, and context assembly.
 */

import { getDocumentStore, type DocumentMatch } from './documentStore';
import { buildQueryPlan, type QueryPlan } from './queryPlanner';

export type HopType = 'primary' | 'sub-query' | 'expansion';

export interface HopResult {
    query: string;
    type: HopType;
    matches: DocumentMatch[];
}

export interface MultiHopContext {
    plan: QueryPlan;
    hops: HopResult[];
    context: string;
}

interface CandidateQuery {
    query: string;
    type: HopType;
}

const TOKEN_RATIO = 4; // rough 1 token ≈ 4 chars
const DEFAULT_MAX_TOKENS = 2000;

function estimateTokens(text: string): number {
    return Math.ceil(text.length / TOKEN_RATIO);
}

function buildContextBlock(match: DocumentMatch, citationNumber: number): string {
    const { citation } = match;

    // Build citation header with number and metadata
    let header = `[${citationNumber}] **${citation.documentName}**`;

    if (citation.pageNumber) {
        header += ` (Page ${citation.pageNumber})`;
    }
    if (citation.sectionTitle) {
        header += ` › ${citation.sectionTitle}`;
    }

    // Add match type indicator
    const matchTypeIcon = citation.matchType === 'semantic' ? '🔍'
        : citation.matchType === 'keyword' ? '📝'
            : '🔀';
    header += ` ${matchTypeIcon}`;

    return `${header}\n${match.chunk.content}\n`;
}

export async function buildMultiHopDocumentContext(query: string, maxTokens = DEFAULT_MAX_TOKENS): Promise<MultiHopContext | null> {
    const store = getDocumentStore();
    if (store.getAll().length === 0) {
        return null;
    }

    const plan = buildQueryPlan(query);
    const candidates: CandidateQuery[] = [];

    if (plan.normalized) {
        candidates.push({ query: plan.normalized, type: 'primary' });
    }

    plan.subQueries.forEach(q => candidates.push({ query: q, type: 'sub-query' }));
    plan.expansions.forEach(q => candidates.push({ query: q, type: 'expansion' }));

    const dedupedCandidates = Array.from(
        new Map(candidates.map(c => [c.query.toLowerCase(), c])).values()
    ).slice(0, 5);

    const hops: HopResult[] = [];
    const usedChunks = new Set<string>();
    const contextParts: string[] = ['### Multi-hop Document Context'];
    if (plan.reasoning.length > 0) {
        contextParts.push(`_Planner hints: ${plan.reasoning.join(' • ')}_`);
    }

    let tokenBudget = 0;

    let citationCounter = 0;

    for (const candidate of dedupedCandidates) {
        const matches = await store.searchAsync(candidate.query, 4);
        if (matches.length === 0) continue;

        hops.push({ query: candidate.query, type: candidate.type, matches });
        contextParts.push(`\n#### Hop (${candidate.type}) → ${candidate.query}`);

        for (const match of matches) {
            const chunkKey = `${match.document.id}_${match.chunk.id}`;
            if (usedChunks.has(chunkKey)) continue;

            const chunkTokens = estimateTokens(match.chunk.content);
            if (tokenBudget + chunkTokens > maxTokens) {
                break;
            }

            citationCounter++;
            contextParts.push(buildContextBlock(match, citationCounter));
            usedChunks.add(chunkKey);
            tokenBudget += chunkTokens;
        }

        if (tokenBudget >= maxTokens) {
            break;
        }
    }

    if (hops.length === 0 || tokenBudget === 0) {
        return null;
    }

    contextParts.push('\n**Use the above evidence to ground your answer. Cite document names when referencing facts.**');

    return {
        plan,
        hops,
        context: contextParts.join('\n')
    };
}
