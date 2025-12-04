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
  // Fast models - high throughput
  { name: 'gemini-2.0-flash', rpm: 15, tpm: 1000000, priority: 1, category: 'balanced' },
  
  // Balanced models
  { name: 'gemini-2.5-flash', rpm: 10, tpm: 250000, priority: 2, category: 'balanced' },
  { name: 'gemini-2.5-flash-lite', rpm: 15, tpm: 250000, priority: 3, category: 'fast' },
  
  // Quality models - for complex queries
  { name: 'gemini-2.5-pro', rpm: 2, tpm: 125000, priority: 4, category: 'quality' },
  
  // Experimental/Other
  { name: 'gemini-2.0-flash-exp', rpm: 10, tpm: 1000000, priority: 5, category: 'balanced' },
  { name: 'learnlm-2.0-flash-experimental', rpm: 15, tpm: 500000, priority: 6, category: 'balanced' },
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
import { webSearch, formatSearchResultsForAI, type SearchResult } from './webSearch';
import { getDocumentStore } from './documentStore';

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
    // Preprocess the message
    const { processed, ragContext, directAnswer } = preprocessMessage(message);
    
    // If we have a direct answer from knowledge base, return it
    if (directAnswer) {
        console.log('📚 Direct answer from knowledge base');
        return {
            answer: postprocessResponse(directAnswer),
            sources: ['Sinhala Knowledge Base'],
            confidence: 'high',
            rag_used: true,
        };
    }
    
    // Build enhanced prompt with RAG context
    const enhancedMessage = buildEnhancedPrompt(processed, ragContext);
    
    // Determine if we need quality model (longer/complex queries)
    const preferQuality = message.length > 200 || ragContext.length > 500;
    
    // Try with automatic fallback across models
    const result = await tryWithFallback(async (model) => {
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model.name}:generateContent?key=${GEMINI_API_KEY}`;
        
        const response = await fetch(apiUrl, {
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
                                text: enhancedMessage,
                            },
                        ],
                    },
                ],
            }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || `HTTP ${response.status}`);
        }

        const data = await response.json();
        let answer = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response received';
        
        // Post-process the response
        answer = postprocessResponse(answer);

        return {
            answer,
            sources: ragContext ? ['Sinhala Knowledge Base'] : [],
            confidence: ragContext ? 'high' : 'medium',
            rag_used: !!ragContext,
            model: model.name, // Include which model was used
        };
    }, preferQuality);
    
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
    options?: { 
        enableWebSearch?: boolean;
        enableDocumentContext?: boolean;
        onSearchStart?: () => void;
        onSearchResults?: (results: SearchResult[]) => void;
    }
) {
    // Preprocess the message
    const { processed, wasSinglish, ragContext, directAnswer } = preprocessMessage(message);
    
    // Log Singlish conversion if applicable
    if (wasSinglish) {
        console.log('🔄 Singlish converted:', message, '→', processed);
    }

    // Get document context if documents are loaded
    let documentContext = '';
    if (options?.enableDocumentContext !== false) {
        const docStore = getDocumentStore();
        if (docStore.getAll().length > 0) {
            documentContext = docStore.getContextForQuery(message, 2000);
            if (documentContext) {
                console.log('📄 Document context added to prompt');
            }
        }
    }

    // Handle web search if enabled
    let webSearchContext = '';
    let searchResults: SearchResult[] = [];
    
    if (options?.enableWebSearch) {
        console.log('🌐 Web search enabled, searching...');
        options.onSearchStart?.();
        
        try {
            const searchResponse = await webSearch(message);
            searchResults = searchResponse.results;
            
            if (searchResults.length > 0) {
                webSearchContext = formatSearchResultsForAI(searchResults);
                options.onSearchResults?.(searchResults);
                console.log(`✅ Found ${searchResults.length} search results`);
            }
        } catch (error) {
            console.warn('Web search failed:', error);
        }
    }
    
    // Check cache for similar queries (only for simple queries without much context)
    const cacheKey = processed.toLowerCase().trim();
    if (!conversationHistory || conversationHistory.length === 0) {
        // Don't use cache if web search or document context is enabled
        if (!options?.enableWebSearch && !documentContext) {
            const cachedResponse = responseCache.get(cacheKey);
            if (cachedResponse) {
                console.log('📦 Returning cached response');
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
    
    // Build enhanced prompt with RAG context and web search context
    let enhancedMessage = buildEnhancedPrompt(processed, ragContext);
    
    // Add document context if available
    if (documentContext) {
        enhancedMessage = `[DOCUMENT CONTEXT - Use this information to answer questions about the uploaded documents]\n${documentContext}\n[END DOCUMENT CONTEXT]\n\n${enhancedMessage}`;
        console.log('📄 Document context added to prompt');
    }
    
    // Add web search context if available
    if (webSearchContext) {
        enhancedMessage = `${webSearchContext}\n\n${enhancedMessage}`;
        console.log('🌐 Web search context added to prompt');
    }
    
    if (ragContext) {
        console.log('📚 RAG context added to prompt');
    }

    // Determine if we need quality model
    const preferQuality = message.length > 200 || ragContext.length > 500;
    
    // If a specific model is selected, use only that model
    // Otherwise, try streaming with fallback across models
    let models: ModelConfig[];
    
    if (selectedModelId) {
        const selectedModel = AVAILABLE_MODELS.find(m => m.name === selectedModelId);
        if (selectedModel) {
            models = [selectedModel];
        } else {
            models = preferQuality
                ? AVAILABLE_MODELS.filter(m => m.category !== 'fast').sort((a, b) => a.priority - b.priority)
                : [...AVAILABLE_MODELS].sort((a, b) => a.priority - b.priority);
        }
    } else {
        models = preferQuality
            ? AVAILABLE_MODELS.filter(m => m.category !== 'fast').sort((a, b) => a.priority - b.priority)
            : [...AVAILABLE_MODELS].sort((a, b) => a.priority - b.priority);
    }
    
    // Build conversation history for API
    const historyContents = conversationHistory 
        ? conversationHistory.map(msg => ({
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: msg.content }]
        }))
        : [];
    
    let lastError: Error | null = null;
    let fullResponse = ''; // Collect full response for caching
    
    for (const model of models) {
        try {
            console.log(`🤖 Trying streaming with: ${model.name}${historyContents.length > 0 ? ` (with ${historyContents.length} history messages)` : ''}`);
            const streamUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model.name}:streamGenerateContent?alt=sse&key=${GEMINI_API_KEY}`;
            
            // Build contents array with history + current message
            const contents = [
                ...historyContents,
                {
                    role: 'user',
                    parts: [{ text: enhancedMessage }]
                }
            ];
            
            const response = await fetch(streamUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    system_instruction: {
                        parts: [{ text: SYSTEM_INSTRUCTION }]
                    },
                    contents: contents,
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error?.message || `HTTP error: ${response.status}`);
            }

            // Success! Record usage and process stream
            recordModelUsage(model.name);
            console.log(`✅ Streaming with: ${model.name}`);

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
                            const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
                            if (text) {
                                fullResponse += text; // Collect for caching
                                onChunk(text);
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