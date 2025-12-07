/**
 * Predictive Loader Module for MIRA
 * Predicts likely follow-up questions and pre-fetches responses
 */

import { storePrefetchedResponse, getPrefetchedResponse } from './offlineSync';

// Common follow-up patterns in Sinhala/English
const FOLLOW_UP_PATTERNS = {
    clarification: [
        'ඒ කියන්නේ මොකක්ද',
        'ඒක හොඳින් පැහැදිලි කරන්න',
        'ඒක ගැන තවත් කියන්න',
        'what do you mean',
        'can you explain more',
        'tell me more about',
        'what is',
        'how does',
    ],
    examples: [
        'උදාහරණයක් දෙන්න',
        'example එකක් දෙන්න',
        'give an example',
        'show me an example',
        'for example',
    ],
    howTo: [
        'ඒක කරන්නේ කොහොමද',
        'කොහොමද කරන්නේ',
        'how to',
        'how do I',
        'how can I',
        'steps to',
    ],
    alternatives: [
        'වෙන ක්‍රමයක් තියෙනවද',
        'වෙනත් ක්‍රම',
        'is there another way',
        'alternative',
        'other options',
        'different approach',
    ],
    comparison: [
        'වෙනස මොකක්ද',
        'difference between',
        'compare',
        'vs',
        'which is better',
    ],
};

// Topic extraction keywords
const TOPIC_KEYWORDS = {
    programming: ['code', 'programming', 'function', 'variable', 'api', 'debug', 'error', 'bug'],
    learning: ['learn', 'study', 'understand', 'practice', 'tutorial', 'course'],
    language: ['sinhala', 'english', 'translate', 'word', 'meaning', 'grammar'],
    general: ['what', 'why', 'how', 'when', 'where', 'who'],
};

export interface PredictedFollowUp {
    query: string;
    probability: number;
    category: 'clarification' | 'example' | 'howto' | 'alternative' | 'related' | 'deeper';
    prefetched?: boolean;
}

interface ConversationContext {
    lastUserMessage: string;
    lastAssistantResponse: string;
    topics: string[];
    messageCount: number;
}

let currentContext: ConversationContext | null = null;
let prefetchQueue: Map<string, Promise<void>> = new Map();

/**
 * Extract main topic/entity from message
 */
function extractTopics(message: string): string[] {
    const topics: string[] = [];
    const words = message.toLowerCase().split(/\s+/);

    // Look for quoted terms
    const quotedMatch = message.match(/"([^"]+)"/g);
    if (quotedMatch) {
        topics.push(...quotedMatch.map(q => q.replace(/"/g, '')));
    }

    // Look for capitalized words (likely proper nouns/technical terms)
    const capitalizedMatch = message.match(/\b[A-Z][a-zA-Z]+\b/g);
    if (capitalizedMatch) {
        topics.push(...capitalizedMatch.map(w => w.toLowerCase()));
    }

    // Look for keywords
    for (const [category, keywords] of Object.entries(TOPIC_KEYWORDS)) {
        if (keywords.some(k => words.includes(k))) {
            topics.push(category);
        }
    }

    // Extract Sinhala key terms (words longer than 4 chars that aren't common)
    const sinhalaWords = message.match(/[\u0D80-\u0DFF]+/g);
    if (sinhalaWords) {
        topics.push(...sinhalaWords.filter(w => w.length > 4).slice(0, 3));
    }

    return [...new Set(topics)].slice(0, 5);
}

/**
 * Generate predicted follow-up questions based on context
 */
export function predictFollowUps(
    userMessage: string,
    assistantResponse: string,
    history?: Array<{ role: 'user' | 'assistant'; content: string }>
): PredictedFollowUp[] {
    const predictions: PredictedFollowUp[] = [];
    const topics = extractTopics(userMessage + ' ' + assistantResponse);

    // Update context
    currentContext = {
        lastUserMessage: userMessage,
        lastAssistantResponse: assistantResponse,
        topics,
        messageCount: (history?.length || 0) + 2,
    };

    // Predict clarification if response was long or technical
    if (assistantResponse.length > 500 || /[`\[\]{}()]/.test(assistantResponse)) {
        predictions.push({
            query: `${topics[0] || 'ඒක'} ගැන තවත් පැහැදිලි කරන්න`,
            probability: 0.7,
            category: 'clarification',
        });
    }

    // Predict example request if response mentions concepts
    if (/උදාහරණයක්|example|instance|such as/i.test(assistantResponse)) {
        predictions.push({
            query: `${topics[0] || 'ඒකට'} උදාහරණයක් දෙන්න`,
            probability: 0.6,
            category: 'example',
        });
    }

    // Predict "how to" if response describes a concept
    if (/යනු|means|is a|refers to/i.test(assistantResponse)) {
        predictions.push({
            query: `${topics[0] || 'ඒක'} කරන්නේ කොහොමද`,
            probability: 0.5,
            category: 'howto',
        });
    }

    // Predict alternatives if discussing methods/approaches
    if (/ක්‍රමය|method|approach|way|option/i.test(assistantResponse)) {
        predictions.push({
            query: `${topics[0] || 'ඒකට'} වෙන ක්‍රමයක් තියෙනවද`,
            probability: 0.4,
            category: 'alternative',
        });
    }

    // Predict deeper dive based on topics
    if (topics.length > 0) {
        predictions.push({
            query: `${topics[0]} ගැන වැඩි විස්තර කියන්න`,
            probability: 0.5,
            category: 'deeper',
        });
    }

    // Add related topic predictions
    if (topics.length > 1) {
        predictions.push({
            query: `${topics[0]} සහ ${topics[1]} අතර සම්බන්ධය මොකක්ද`,
            probability: 0.3,
            category: 'related',
        });
    }

    // Sort by probability and return top 3
    return predictions
        .sort((a, b) => b.probability - a.probability)
        .slice(0, 3);
}

/**
 * Prefetch responses for predicted follow-ups (runs in background)
 */
export async function prefetchResponses(
    predictions: PredictedFollowUp[],
    fetchFunction: (query: string) => Promise<string>
): Promise<void> {
    // Only prefetch high-probability predictions when online
    if (!navigator.onLine) {
        console.log('📴 Skipping prefetch - offline');
        return;
    }

    const toPrefetch = predictions.filter(p => p.probability >= 0.5);

    for (const prediction of toPrefetch) {
        // Skip if already prefetching
        if (prefetchQueue.has(prediction.query)) {
            continue;
        }

        // Check if already cached
        const cached = await getPrefetchedResponse(prediction.query);
        if (cached) {
            prediction.prefetched = true;
            continue;
        }

        // Prefetch in background with low priority
        const prefetchPromise = (async () => {
            try {
                console.log(`🔮 Prefetching: "${prediction.query.substring(0, 40)}..."`);

                // Use requestIdleCallback if available for low-priority execution
                if ('requestIdleCallback' in window) {
                    await new Promise<void>(resolve => {
                        requestIdleCallback(() => resolve(), { timeout: 5000 });
                    });
                }

                const response = await fetchFunction(prediction.query);
                await storePrefetchedResponse(prediction.query, response);
                prediction.prefetched = true;

                console.log(`✅ Prefetched response for: "${prediction.query.substring(0, 40)}..."`);
            } catch (error) {
                console.warn(`⚠️ Prefetch failed for: "${prediction.query.substring(0, 40)}..."`, error);
            } finally {
                prefetchQueue.delete(prediction.query);
            }
        })();

        prefetchQueue.set(prediction.query, prefetchPromise);
    }
}

/**
 * Get prefetched response if available
 */
export async function getPrefetched(query: string): Promise<string | null> {
    const cached = await getPrefetchedResponse(query);
    if (cached) {
        console.log(`🚀 Using prefetched response for: "${query.substring(0, 40)}..."`);
        return cached.response;
    }
    return null;
}

/**
 * Check if query matches a prediction with prefetched response
 */
export function matchesPrediction(query: string): PredictedFollowUp | null {
    if (!currentContext) return null;

    const normalizedQuery = query.toLowerCase().trim();

    // Check for pattern matches
    for (const [category, patterns] of Object.entries(FOLLOW_UP_PATTERNS)) {
        if (patterns.some(p => normalizedQuery.includes(p.toLowerCase()))) {
            return {
                query,
                probability: 0.8,
                category: category as PredictedFollowUp['category'],
                prefetched: false,
            };
        }
    }

    return null;
}

/**
 * Get suggested follow-up questions for UI display
 */
export function getSuggestedQuestions(): string[] {
    if (!currentContext) return [];

    const suggestions: string[] = [];
    const { topics } = currentContext;

    if (topics.length > 0) {
        suggestions.push(`${topics[0]} ගැන තවත් කියන්න`);
        suggestions.push(`${topics[0]} කරන්නේ කොහොමද?`);
        if (topics.length > 1) {
            suggestions.push(`${topics[1]} ගැන පැහැදිලි කරන්න`);
        }
    }

    return suggestions.slice(0, 3);
}

/**
 * Learn from user behavior to improve predictions
 */
export function recordUserFollowUp(query: string): void {
    if (!currentContext) return;

    // This could be expanded to store patterns in IndexedDB
    // and use them to improve future predictions
    console.log(`📊 Recording follow-up pattern: "${query.substring(0, 40)}..."`);
}

/**
 * Clear prediction context
 */
export function clearPredictionContext(): void {
    currentContext = null;
    prefetchQueue.clear();
}

/**
 * Get current context topics (for debugging/UI)
 */
export function getCurrentTopics(): string[] {
    return currentContext?.topics || [];
}
