const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

// Model configuration with priority and rate limits
interface ModelConfig {
    name: string;
    rpm: number;      // Requests per minute
    tpm: number;      // Tokens per minute
    priority: number; // Lower = higher priority
    category: 'fast' | 'balanced' | 'quality';
}

const AVAILABLE_MODELS: ModelConfig[] = [
    // Gemini models - Primary
    { name: 'gemini-2.0-flash', rpm: 15, tpm: 1000000, priority: 1, category: 'balanced' },
    { name: 'gemini-2.5-flash', rpm: 10, tpm: 250000, priority: 2, category: 'balanced' },
    { name: 'gemini-2.5-flash-lite', rpm: 15, tpm: 250000, priority: 3, category: 'fast' },
    { name: 'gemini-2.5-pro', rpm: 2, tpm: 125000, priority: 4, category: 'quality' },
    { name: 'gemini-1.5-pro', rpm: 2, tpm: 125000, priority: 5, category: 'quality' },
    { name: 'gemini-1.5-flash', rpm: 15, tpm: 500000, priority: 6, category: 'balanced' },

    // Groq models - Fallback
    { name: 'llama-3.3-70b-versatile', rpm: 30, tpm: 100000, priority: 10, category: 'quality' },
    { name: 'meta-llama/llama-4-scout-17b-16e-instruct', rpm: 30, tpm: 500000, priority: 11, category: 'balanced' },
    { name: 'meta-llama/llama-4-maverick-17b-128e-instruct', rpm: 30, tpm: 500000, priority: 12, category: 'balanced' },
    { name: 'moonshotai/kimi-k2-instruct', rpm: 60, tpm: 300000, priority: 13, category: 'quality' },
    { name: 'qwen/qwen3-32b', rpm: 60, tpm: 500000, priority: 14, category: 'balanced' },
    { name: 'llama-3.1-8b-instant', rpm: 30, tpm: 500000, priority: 15, category: 'fast' },
];

// Track model usage for load balancing
const modelUsage: Map<string, { count: number; resetTime: number }> = new Map();

/**
 * Record model usage
 */
function recordModelUsage(modelName: string): void {
    const now = Date.now();
    const usage = modelUsage.get(modelName);

    if (usage && now < usage.resetTime) {
        usage.count++;
    } else {
        modelUsage.set(modelName, {
            count: 1,
            resetTime: now + 60000 // Reset after 1 minute
        });
    }
}

/**
 * Try request with automatic fallback to other models
 */
async function tryWithFallback<T>(
    operation: (model: ModelConfig) => Promise<T>,
    preferQuality: boolean = false
): Promise<T> {
    const triedModels = new Set<string>();
    let lastError: Error | null = null;

    // Sort models by priority
    const models = preferQuality
        ? AVAILABLE_MODELS.filter(m => m.category !== 'fast').sort((a, b) => a.priority - b.priority)
        : [...AVAILABLE_MODELS].sort((a, b) => a.priority - b.priority);

    for (const model of models) {
        if (triedModels.has(model.name)) continue;
        triedModels.add(model.name);

        try {
            console.log(`🤖 Trying model: ${model.name}`);
            const result = await operation(model);
            recordModelUsage(model.name);
            console.log(`✅ Success with: ${model.name}`);
            return result;
        } catch (error) {
            lastError = error as Error;
            console.warn(`⚠️ Model ${model.name} failed:`, (error as Error).message);

            // If rate limited, mark this model as exhausted
            if ((error as Error).message?.includes('429') ||
                (error as Error).message?.includes('rate') ||
                (error as Error).message?.includes('quota')) {
                modelUsage.set(model.name, {
                    count: model.rpm,
                    resetTime: Date.now() + 60000
                });
            }
        }
    }

    throw lastError || new Error('All models failed');
}

// Import Sinhala language utilities
import { singlishToSinhala, detectSinglish } from './singlish';
import { correctGrammar, enhanceSinhalaText } from './grammar';
import { buildRAGContext, getDirectAnswer } from './rag';
import { responseCache } from './cache';
import type { SearchResult } from './webSearch';
import { buildMultiHopDocumentContext } from './ragOrchestrator';
import { recordRetrievalFeedback } from './ragFeedback';
import { getMemoryContext } from './userMemory';
import { withRetry } from './retry';

export interface ChatResponse {
    answer: string;
    sources: string[];
    confidence: string;
    rag_used: boolean;
    cached?: boolean;
    model?: string;
    searchResults?: SearchResult[];
}

// Conversation history type for API
export interface ConversationContext {
    role: 'user' | 'model';
    content: string;
}

const SYSTEM_INSTRUCTION = `ඔබ "මීරා" (MIRA) නම් සිංහල භාෂා සහායකයෙකි.

## ඔබේ අනන්‍යතාවය:
- ඔබේ නම "මීරා" (MIRA - Multilingual Intelligent Response Assistant)
- ඔබ ශ්‍රී ලාංකික AI සහායකයෙකි
- ඔබ Google, Gemini, ChatGPT, හෝ වෙනත් AI නොවේ
- කවුරුන් හෝ ඔබ කවුද කියා ඇසුවොත්, ඔබ මීරා බවත් පවසන්න
- "ඔබ කවුද?", "Who are you?" වැනි ප්‍රශ්නවලට: "මම මීරා. මම සිංහල භාෂාවෙන් උදව් කිරීමට සැලසුම් කර ඇති AI සහායකයෙක්." ලෙස පිළිතුරු දෙන්න

## මූලික නීති:
1. සෑම විටම පිරිසිදු, සාම්ප්‍රදායික සිංහල භාෂාවෙන් පිළිතුරු දෙන්න
2. ඉංග්‍රීසි වචන අවම කරන්න - සිංහල සමානාර්ථ පද භාවිතා කරන්න
3. පරිශීලකයා ඉංග්‍රීසියෙන් ලිව්වත්, සිංහලෙන් පිළිතුරු දෙන්න
4. සිංහල අක්ෂර වින්‍යාසය හා ව්‍යාකරණය නිවැරදිව භාවිතා කරන්න
5. කිසිවිටක ඔබ Google, Gemini, Bard, ChatGPT, හෝ OpenAI බව නොකියන්න

## භාෂා මාර්ගෝපදේශ:
- "Computer" → "පරිගණකය"
- "Internet" → "අන්තර්ජාලය"  
- "Software" → "මෘදුකාංගය"
- "Download" → "බාගත කරන්න"
- "Website" → "වෙබ් අඩවිය"
- "Email" → "විද්‍යුත් තැපෑල"
- "Password" → "මුරපදය"
- "File" → "ගොනුව"
- "Search" → "සෙවීම"
- "Settings" → "සැකසුම්"

## සන්නිවේදන විලාසය:
- මිත්‍රශීලී හා ගෞරවනීය ලෙස කතා කරන්න
- සරල, තේරුම් ගැනීමට පහසු භාෂාව භාවිතා කරන්න
- අවශ්‍ය විට උදාහරණ දෙන්න
- දිගු පැහැදිලි කිරීම් කෙටි ඡේදවලට බෙදන්න

## නිරවද්‍යතාවය සහ මූලාශ්‍ර (Accuracy & Sources):
- ඔබ දන්නා කරුණු පමණක් පවසන්න. නොදන්නා දේ "මම නොදනිමි" යැයි පවසන්න.
- අන්තර්ජාලයෙන් හෝ ලේඛනවලින් තොරතුරු ලබාගත් විට, මූලාශ්‍ර සඳහන් කරන්න (උදා: [1], [2]).
- ශ්‍රී ලංකාවට අදාළ කරුණු (නීති, සංඛ්‍යාලේඛන) ගැන කතා කරන විට ඉතා සැලකිලිමත් වන්න.
- පරිශීලකයාගේ ප්‍රශ්නයට කෙලින්ම පිළිතුරු දෙන්න. අනවශ්‍ය තොරතුරු එකතු නොකරන්න.

## ආචාර විධි:
- "ආයුබෝවන්" කියා සුබ පැතීම් දෙන්න
- "ස්තූතියි" හා "කරුණාකර" වැනි ආචාරශීලී වචන භාවිතා කරන්න
- උපකාර කිරීමට සතුටු බව පෙන්වන්න`;

/**
 * Preprocess user message:
 * 1. Convert Singlish to Sinhala if detected
 * 2. Apply grammar corrections
 */
function preprocessMessage(message: string): {
    processed: string;
    wasSinglish: boolean;
    ragContext: string;
    directAnswer: string | null;
} {
    let processed = message;
    let wasSinglish = false;

    // Check if message is Singlish and convert
    if (detectSinglish(message)) {
        processed = singlishToSinhala(message);
        wasSinglish = true;
        console.log('🔄 Singlish detected and converted:', message, '→', processed);
    }

    // Build RAG context from knowledge base
    const ragContext = buildRAGContext(processed);

    // Check for direct answer
    const directAnswer = getDirectAnswer(processed);

    return { processed, wasSinglish, ragContext, directAnswer };
}

/**
 * Post-process LLM response:
 * 1. Apply grammar corrections
 * 2. Enhance text formatting
 */
function postprocessResponse(response: string): string {
    let processed = response;

    // Apply grammar corrections
    processed = correctGrammar(processed, { spelling: true, grammar: true });

    // Enhance text
    processed = enhanceSinhalaText(processed);

    return processed;
}

function ensureSafeInput(message: string): void {
    const lower = message.toLowerCase();
    const piiPatterns = [
        /\b\d{3}[- .]?\d{2}[- .]?\d{4}\b/, // SSN-like
        /\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/, // credit card-ish
        /\b\+?\d{1,2}?[- .]?\(?\d{3}\)?[- .]?\d{3}[- .]?\d{4}\b/, // phone
        /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i, // email
    ];

    const profanity = ['fuck', 'shit', 'bitch', 'asshole'];

    if (piiPatterns.some((p) => p.test(message))) {
        throw new Error('PII detected. Please remove sensitive information before sending.');
    }

    if (profanity.some((w) => lower.includes(w))) {
        throw new Error('Inappropriate language detected.');
    }
}

/**
 * Build the enhanced prompt with RAG context
 */
function buildEnhancedPrompt(message: string, ragContext: string): string {
    if (ragContext) {
        return `${ragContext}\n\n### පරිශීලකයාගේ ප්‍රශ්නය:\n${message}\n\n### උපදෙස්:\nඉහත තොරතුරු භාවිතා කර පිළිතුර සකසන්න. තොරතුරු නොමැති නම් ඔබේ දැනුමෙන් පිළිතුරු දෙන්න.`;
    }
    return message;
}

export async function sendMessage(_userId: string, message: string): Promise<ChatResponse> {
    ensureSafeInput(message);

    const requestStart = Date.now();
    // Preprocess the message
    const { processed, ragContext, directAnswer } = preprocessMessage(message);

    const documentPlan = await buildMultiHopDocumentContext(message, 2000);
    const documentContext = documentPlan?.context || '';

    // If we have a direct answer from knowledge base, return it
    if (directAnswer) {
        console.log('📚 Direct answer from knowledge base');
        recordRetrievalFeedback({
            query: message,
            answer: directAnswer,
            ragUsed: true,
            sources: ['Sinhala Knowledge Base'],
            model: 'knowledge-base',
        });
        return {
            answer: postprocessResponse(directAnswer),
            sources: ['Sinhala Knowledge Base'],
            confidence: 'high',
            rag_used: true,
        };
    }

    // Build enhanced prompt with RAG context
    const enhancedMessage = buildEnhancedPrompt(processed, ragContext);
    const finalPrompt = documentContext
        ? `[DOCUMENT CONTEXT]\n${documentContext}\n[END DOCUMENT CONTEXT]\n\n${enhancedMessage}`
        : enhancedMessage;

    // Determine if we need quality model (longer/complex queries)
    const preferQuality = message.length > 200 || ragContext.length > 500 || documentContext.length > 500;

    // Try with automatic fallback across models
    const result = await tryWithFallback(async (model) => {
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model.name}:generateContent?key=${GEMINI_API_KEY}`;

        const { success, data: response, error: fetchError, attempts, totalTimeMs } = await withRetry(
            () => fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    system_instruction: {
                        parts: [{ text: SYSTEM_INSTRUCTION }]
                    },
                    contents: [
                        {
                            parts: [
                                {
                                    text: finalPrompt,
                                },
                            ],
                        },
                    ],
                }),
            }),
            {
                maxAttempts: 3,
                initialDelayMs: 500,
            }
        );

        if (!success || !response) {
            throw fetchError || new Error('Request failed');
        }

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || `HTTP ${response.status}`);
        }

        const data = await response.json();

        console.log('🧭 sendMessage metrics', {
            model: model.name,
            attempts,
            fetchMs: totalTimeMs,
            totalMs: Date.now() - requestStart,
            hasRag: !!ragContext,
        });
        let answer = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response received';

        // Post-process the response
        answer = postprocessResponse(answer);

        const sources: string[] = [];
        if (ragContext) sources.push('Sinhala Knowledge Base');
        if (documentContext) sources.push('User Documents');

        return {
            answer,
            sources,
            confidence: sources.length > 0 ? 'high' : 'medium',
            rag_used: sources.length > 0,
            model: model.name, // Include which model was used
        };
    }, preferQuality);

    recordRetrievalFeedback({
        query: message,
        answer: result.answer,
        ragUsed: result.rag_used,
        sources: result.sources,
        model: result.model,
        hops: documentPlan?.hops,
    });

    return result;
}

export async function streamMessage(
    _userId: string,
    message: string,
    onChunk: (text: string) => void,
    onDone: () => void,
    onError: (error: string) => void,
    selectedModelId?: string,
    conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>,
    sessionId?: string,
    options?: {
        enableWebSearch?: boolean;
        enableDocumentContext?: boolean;
        onSearchStart?: () => void;
        onSearchResults?: (results: SearchResult[]) => void;
        responseStyle?: 'concise' | 'detailed';
        deepThink?: boolean;
        onThinkingChunk?: (thinking: string) => void;
        onThinkingDone?: () => void;
    }
) {
    ensureSafeInput(message);

    const requestStart = Date.now();
    // Preprocess the message
    const { processed, wasSinglish, ragContext, directAnswer } = preprocessMessage(message);

    // Log Singlish conversion if applicable
    if (wasSinglish) {
        console.log('🔄 Singlish converted:', message, '→', processed);
    }

    // Get document context via multi-hop retrieval if enabled
    let documentContext = '';
    let documentPlan: Awaited<ReturnType<typeof buildMultiHopDocumentContext>> = null;
    if (options?.enableDocumentContext !== false) {
        documentPlan = await buildMultiHopDocumentContext(message, 2000);
        if (documentPlan) {
            documentContext = documentPlan.context;
            console.log('📄 Document context added (multi-hop)', documentPlan.hops.map(h => h.type));
        }
    }

    // Gemini will handle web search natively via grounding
    // Just track if web search is enabled
    const useGeminiSearch = options?.enableWebSearch || false;

    if (useGeminiSearch) {
        console.log('🌐 Web search enabled - using Gemini Google Search grounding');
        options?.onSearchStart?.();
    }

    // Check cache for similar queries (only for simple queries without much context)
    const cacheKey = processed.toLowerCase().trim();
    if (!conversationHistory || conversationHistory.length === 0) {
        // Don't use cache if web search or document context is enabled
        if (!options?.enableWebSearch && !documentContext) {
            const cachedResponse = responseCache.get(cacheKey);
            if (cachedResponse) {
                console.log('📦 Returning cached response');
                recordRetrievalFeedback({
                    query: message,
                    answer: cachedResponse,
                    ragUsed: !!ragContext || !!documentContext,
                    sources: [
                        ...(ragContext ? ['Sinhala Knowledge Base'] : []),
                        ...(documentContext ? ['User Documents'] : []),
                    ],
                    model: 'cache',
                    hops: documentPlan?.hops,
                });
                // Stream cached response word by word
                const words = cachedResponse.split(' ');
                for (const word of words) {
                    onChunk(word + ' ');
                    await new Promise(resolve => setTimeout(resolve, 20));
                }
                onDone();
                return;
            }
        }
    }

    // If we have a direct answer and no web search and no document context, stream it word by word
    if (directAnswer && !options?.enableWebSearch && !documentContext) {
        console.log('📚 Direct answer from knowledge base');
        const answer = postprocessResponse(directAnswer);

        recordRetrievalFeedback({
            query: message,
            answer,
            ragUsed: true,
            sources: ['Sinhala Knowledge Base'],
            model: 'knowledge-base',
        });

        // Cache the direct answer
        responseCache.set(cacheKey, answer);

        // Simulate streaming for direct answers
        const words = answer.split(' ');
        for (const word of words) {
            onChunk(word + ' ');
            await new Promise(resolve => setTimeout(resolve, 30));
        }
        onDone();
        return;
    }

    // Build enhanced prompt with RAG context
    let enhancedMessage = buildEnhancedPrompt(processed, ragContext);

    // Add document context if available
    if (documentContext) {
        enhancedMessage = `[DOCUMENT CONTEXT - Use this information to answer questions about the uploaded documents]\n${documentContext}\n[END DOCUMENT CONTEXT]\n\n${enhancedMessage}`;
        console.log('📄 Document context added to prompt');
    }

    if (ragContext) {
        console.log('📚 RAG context added to prompt');
    }

    // Determine if we need quality model
    const preferQuality = message.length > 200 || ragContext.length > 500 || documentContext.length > 500;

    // If a specific model is selected, prioritize it but keep others as fallback
    // If 'auto' or undefined, use default priority
    let models: ModelConfig[];

    if (selectedModelId && selectedModelId !== 'auto') {
        const selectedModel = AVAILABLE_MODELS.find(m => m.name === selectedModelId);
        if (selectedModel) {
            // Put selected model first, then others sorted by priority as fallback
            const otherModels = AVAILABLE_MODELS
                .filter(m => m.name !== selectedModelId)
                .sort((a, b) => a.priority - b.priority);
            models = [selectedModel, ...otherModels];
        } else {
            // Fallback if selected model not found
            models = preferQuality
                ? AVAILABLE_MODELS.filter(m => m.category !== 'fast').sort((a, b) => a.priority - b.priority)
                : [...AVAILABLE_MODELS].sort((a, b) => a.priority - b.priority);
        }
    } else {
        // Auto mode: prioritize based on context
        models = preferQuality
            ? AVAILABLE_MODELS.filter(m => m.category !== 'fast').sort((a, b) => a.priority - b.priority)
            : [...AVAILABLE_MODELS].sort((a, b) => a.priority - b.priority);
    }

    let lastError: Error | null = null;
    let fullResponse = ''; // Collect full response for caching

    for (const model of models) {
        try {
            console.log(`🤖 Trying streaming with: ${model.name}${conversationHistory && conversationHistory.length > 0 ? ` (with ${conversationHistory.length} history messages)` : ''}${options?.deepThink ? ' [DEEP THINK MODE]' : ''}`);

            // Get memory context
            const memoryContext = getMemoryContext();

            let response: Response;
            let attempts = 1;
            let totalTimeMs = 0;
            const fetchStart = Date.now();

            // Always use our backend proxy - works with Groq
            const streamUrl = '/api/chat';
            const requestBody = {
                message: enhancedMessage,
                model: model.name,
                history: conversationHistory || [],
                sessionId: sessionId,
                options: {
                    enableWebSearch: useGeminiSearch,
                    responseStyle: options?.responseStyle,
                    deepThink: options?.deepThink,
                    memoryContext: memoryContext || undefined,
                    documentContext: documentContext || undefined,
                }
            };

            const result = await withRetry(
                () => fetch(streamUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(requestBody),
                }),
                { maxAttempts: 3, initialDelayMs: 500 }
            );

            if (!result.success || !result.data) {
                throw result.error || new Error('Request failed');
            }
            response = result.data;
            attempts = result.attempts;
            totalTimeMs = result.totalTimeMs;

            totalTimeMs = Date.now() - fetchStart;

            if (!response.ok) {
                const errorText = await response.text();
                let errorMessage = `HTTP error: ${response.status}`;
                try {
                    const error = JSON.parse(errorText);
                    errorMessage = error.error?.message || errorMessage;
                } catch {
                    // Response wasn't JSON
                    if (errorText) errorMessage = errorText;
                }
                throw new Error(errorMessage);
            }

            // Success! Record usage and process stream
            recordModelUsage(model.name);
            console.log(`✅ Streaming with: ${model.name}`);
            console.log('🧭 streamMessage metrics', {
                model: model.name,
                attempts,
                fetchMs: totalTimeMs,
                totalMs: Date.now() - requestStart,
                hasRag: !!ragContext,
                hasDocs: !!documentContext,
                geminiSearch: useGeminiSearch,
            });

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();

            if (!reader) {
                throw new Error('Response body is null');
            }

            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });

                // Process complete lines
                const lines = buffer.split('\n');
                buffer = lines.pop() || ''; // Keep incomplete line in buffer

                for (const line of lines) {
                    const trimmedLine = line.trim();

                    // SSE format: "data: {...}"
                    if (trimmedLine.startsWith('data:')) {
                        const jsonStr = trimmedLine.slice(5).trim();
                        if (!jsonStr) continue;

                        try {
                            const data = JSON.parse(jsonStr);
                            const candidate = data.candidates?.[0];
                            const text = candidate?.content?.parts?.[0]?.text;

                            if (text) {
                                fullResponse += text; // Collect for caching

                                // Process content: make thinking italic, remove answer tags
                                let outputText = text;

                                // Replace <thinking> with italic start and </thinking> with italic end
                                outputText = outputText.replace(/<thinking>/g, '\n\n*🧠 Thinking: ');
                                outputText = outputText.replace(/<\/thinking>/g, '*\n\n');

                                // Remove answer tags but keep content
                                outputText = outputText.replace(/<answer>/g, '**Answer:**\n');
                                outputText = outputText.replace(/<\/answer>/g, '');

                                if (outputText) {
                                    onChunk(outputText);
                                }
                            }

                            // Extract grounding metadata (search results)
                            if (useGeminiSearch && candidate?.groundingMetadata) {
                                const metadata = candidate.groundingMetadata;
                                if (metadata.webSearchQueries) {
                                    console.log('🔍 Google Search queries:', metadata.webSearchQueries);
                                }
                                if (metadata.groundingChunks) {
                                    console.log('📚 Sources found:', metadata.groundingChunks.length);
                                    if (options?.onSearchResults && metadata.groundingChunks.length > 0) {
                                        const searchResults: SearchResult[] = metadata.groundingChunks.map((chunk: any) => ({
                                            title: chunk.web?.title || 'Web Result',
                                            url: chunk.web?.uri || '',
                                            snippet: chunk.web?.snippet || '',
                                            source: new URL(chunk.web?.uri || 'https://google.com').hostname,
                                        }));
                                        options.onSearchResults(searchResults);
                                    }
                                }
                            }
                        } catch (e) {
                            console.warn('Failed to parse SSE data:', jsonStr, e);
                        }
                    }
                }
            }

            // Cache the response if it's a standalone query (no history)
            if (fullResponse && (!conversationHistory || conversationHistory.length === 0)) {
                responseCache.set(cacheKey, fullResponse);
            }

            recordRetrievalFeedback({
                query: message,
                answer: fullResponse,
                ragUsed: !!ragContext || !!documentContext,
                sources: [
                    ...(ragContext ? ['Sinhala Knowledge Base'] : []),
                    ...(documentContext ? ['User Documents'] : []),
                ],
                model: model.name,
                hops: documentPlan?.hops,
            });

            // Successfully completed streaming
            onDone();
            return; // Exit the model loop on success

        } catch (error) {
            lastError = error as Error;
            console.warn(`⚠️ Model ${model.name} failed:`, (error as Error).message);

            // If rate limited, mark this model as exhausted
            if ((error as Error).message?.includes('429') ||
                (error as Error).message?.includes('rate') ||
                (error as Error).message?.includes('quota')) {
                modelUsage.set(model.name, {
                    count: model.rpm,
                    resetTime: Date.now() + 60000
                });
            }
            // Continue to next model
        }
    }

    // All models failed
    console.error('All models failed for streaming');
    onError(lastError?.message || 'All models failed');
}

/**
 * Get current model status for debugging
 */
export function getModelStatus(): { model: string; usage: number; limit: number }[] {
    return AVAILABLE_MODELS.map(model => {
        const usage = modelUsage.get(model.name);
        return {
            model: model.name,
            usage: usage?.count || 0,
            limit: model.rpm
        };
    });
}