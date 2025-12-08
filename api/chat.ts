import type { IncomingMessage, ServerResponse } from 'http';
import { connectToDatabase } from './db/connect';

// Request body interface for chat endpoint
interface ChatRequestBody {
    message: string;
    model?: string;
    history?: Array<{ role: string; content: string }>;
    sessionId?: string;
    options?: {
        responseStyle?: 'concise' | 'detailed';
        deepThink?: boolean;
        memoryContext?: string;
        documentContext?: string;
        enableWebSearch?: boolean;
    };
}

// Vercel serverless function types
interface VercelRequest extends IncomingMessage {
    body: ChatRequestBody;
    query: { [key: string]: string | string[] };
    method?: string;
}

interface VercelResponse extends ServerResponse {
    status: (statusCode: number) => VercelResponse;
    json: (body: Record<string, unknown>) => void;
    setHeader: (name: string, value: string) => this;
    end: (chunk?: unknown) => this;
}

// Groq native models - these are used directly with Groq API
const GROQ_MODELS = [
    // High-performance models
    'llama-3.3-70b-versatile',           // 30 rpm, 1K req/day, 12K context
    'llama-3.1-8b-instant',              // 30 rpm, 14.4K req/day, 6K context

    // LLaMA 4 models
    'meta-llama/llama-4-maverick-17b-128e-instruct',  // 30 rpm, 6K context
    'meta-llama/llama-4-scout-17b-16e-instruct',      // 30 rpm, 30K context

    // Kimi models (higher rate limits)
    'moonshotai/kimi-k2-instruct',       // 60 rpm, 10K context

    // Qwen model
    'qwen/qwen3-32b',                    // 60 rpm, 6K context

    // OpenAI OSS models
    'openai/gpt-oss-120b',               // 30 rpm, 8K context
    'openai/gpt-oss-20b',                // 30 rpm, 8K context
];

// Default Groq model for 'auto' selection
const DEFAULT_GROQ_MODEL = 'llama-3.3-70b-versatile';

// Gemini models - used as fallback when Groq fails or when explicitly selected
const GEMINI_MODELS = [
    'gemini-2.0-flash',
    'gemini-2.0-flash-thinking',
    'gemini-2.5-flash',
    'gemini-2.5-flash-lite',
    'gemini-2.5-pro',
    'gemini-2.0-flash-exp',
    'gemini-2.0-flash-thinking-exp',
    'learnlm-2.0-flash-experimental',
    'gemini-1.5-pro',
    'gemini-1.5-flash'
];

// Default Gemini model for fallback
const DEFAULT_GEMINI_MODEL = 'gemini-2.0-flash';

// Helper to check if a model is a Groq model
function isGroqModel(model: string): boolean {
    return GROQ_MODELS.includes(model) || model === 'auto';
}

// Helper to check if a model is a Gemini model
function isGeminiModel(model: string): boolean {
    return GEMINI_MODELS.includes(model);
}

// Get the actual Groq model to use
function getGroqModel(model: string): string {
    if (model === 'auto') return DEFAULT_GROQ_MODEL;
    return GROQ_MODELS.includes(model) ? model : DEFAULT_GROQ_MODEL;
}

// Get the actual Gemini model to use (for fallback)
function getGeminiModel(model: string): string {
    return GEMINI_MODELS.includes(model) ? model : DEFAULT_GEMINI_MODEL;
}

// System instruction
const SYSTEM_INSTRUCTION = `ඔබ "මීරා" (MIRA) නම් සිංහල භාෂා සහායකයෙකි.

## ඔබේ අනන්‍යතාවය:
- ඔබේ නම "මීරා" (MIRA - Multilingual Intelligent Response Assistant)
- ඔබ ශ්‍රී ලාංකික AI සහායකයෙකි
- ඔබ Google, Gemini, ChatGPT, හෝ වෙනත් AI නොවේ
- කවුරුන් හෝ ඔබ කවුද කියා ඇසුවොත්, ඔබ මීරා බවත් පවසන්න

## මූලික නීති:
1. සෑම විටම පිරිසිදු, සාම්ප්‍රදායික සිංහල භාෂාවෙන් පිළිතුරු දෙන්න
2. ඉංග්‍රීසි වචන අවම කරන්න - සිංහල සමානාර්ථ පද භාවිතා කරන්න
3. පරිශීලකයා ඉංග්‍රීසියෙන් ලිව්වත්, සිංහලෙන් පිළිතුරු දෙන්න
4. සිංහල අක්ෂර වින්‍යාසය හා ව්‍යාකරණය නිවැරදිව භාවිතා කරන්න

## සන්නිවේදන විලාසය:
- මිත්‍රශීලී හා ගෞරවනීය ලෙස කතා කරන්න
- සරල, තේරුම් ගැනීමට පහසු භාෂාව භාවිතා කරන්න

## නිරවද්‍යතාවය සහ මූලාශ්‍ර (Accuracy & Sources):
- ඔබ දන්නා කරුණු පමණක් පවසන්න. නොදන්නා දේ "මම නොදනිමි" යැයි පවසන්න.
- අන්තර්ජාලයෙන් හෝ ලේඛනවලින් තොරතුරු ලබාගත් විට, මූලාශ්‍ර සඳහන් කරන්න (උදා: [1], [2]).
- ශ්‍රී ලංකාවට අදාළ කරුණු (නීති, සංඛ්‍යාලේඛන) ගැන කතා කරන විට ඉතා සැලකිලිමත් වන්න.
- පරිශීලකයාගේ ප්‍රශ්නයට කෙලින්ම පිළිතුරු දෙන්න. අනවශ්‍ය තොරතුරු එකතු නොකරන්න.`;

/**
 * Call Groq API with streaming
 */
async function callGroqAPI(
    groqApiKey: string,
    model: string,
    systemInstruction: string,
    message: string,
    history: Array<{ role: string; content: string }>
): Promise<Response> {
    const groqModel = getGroqModel(model);

    const messages = [
        { role: 'system', content: systemInstruction },
        ...history.map(msg => ({
            role: msg.role === 'assistant' ? 'assistant' : 'user',
            content: msg.content
        })),
        { role: 'user', content: message }
    ];

    console.log(`[API] Calling Groq API with model: ${groqModel}`);

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${groqApiKey}`
        },
        body: JSON.stringify({
            model: groqModel,
            messages,
            stream: true,
            temperature: 0.7,
            max_tokens: 4096
        })
    });

    return response;
}

/**
 * Call Gemini API with streaming
 */
async function callGeminiAPI(
    geminiApiKey: string,
    model: string,
    systemInstruction: string,
    message: string,
    history: Array<{ role: string; content: string }>,
    enableWebSearch: boolean
): Promise<Response> {
    const historyContents = history.map((msg) => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
    }));

    const requestBody: Record<string, unknown> = {
        system_instruction: {
            parts: [{ text: systemInstruction }]
        },
        contents: [
            ...historyContents,
            {
                role: 'user',
                parts: [{ text: message }]
            }
        ],
    };

    if (enableWebSearch) {
        requestBody.tools = [{ googleSearch: {} }];
    }

    console.log(`[API] Calling Gemini API with model: ${model}`);

    const streamUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${geminiApiKey}`;

    const response = await fetch(streamUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
    });

    return response;
}

/**
 * Stream Groq response (OpenAI-compatible SSE format)
 */
async function streamGroqResponse(
    response: Response,
    res: VercelResponse
): Promise<string> {
    const reader = response.body?.getReader();
    if (!reader) {
        throw new Error('Failed to read Groq response');
    }

    const decoder = new TextDecoder();
    let accumulatedResponse = '';

    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');

            for (const line of lines) {
                if (line.startsWith('data:')) {
                    const jsonStr = line.slice(5).trim();
                    if (!jsonStr || jsonStr === '[DONE]') continue;

                    try {
                        const data = JSON.parse(jsonStr);
                        const text = data.choices?.[0]?.delta?.content;
                        if (text) {
                            accumulatedResponse += text;
                            // Convert to Gemini-like SSE format for frontend compatibility
                            const geminiFormat = {
                                candidates: [{
                                    content: {
                                        parts: [{ text }]
                                    }
                                }]
                            };
                            res.write(`data: ${JSON.stringify(geminiFormat)}\n\n`);
                        }
                    } catch {
                        // Ignore parse errors for partial chunks
                    }
                }
            }
        }
    } finally {
        reader.releaseLock();
    }

    return accumulatedResponse;
}

/**
 * Stream Gemini response
 */
async function streamGeminiResponse(
    response: Response,
    res: VercelResponse
): Promise<string> {
    const reader = response.body?.getReader();
    if (!reader) {
        throw new Error('Failed to read Gemini response');
    }

    const decoder = new TextDecoder();
    let accumulatedResponse = '';

    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');

            for (const line of lines) {
                if (line.startsWith('data:')) {
                    const jsonStr = line.slice(5).trim();
                    if (!jsonStr) continue;
                    try {
                        const data = JSON.parse(jsonStr);
                        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
                        if (text) accumulatedResponse += text;
                    } catch {
                        // Ignore parse errors for partial chunks
                    }
                }
            }

            // Forward the SSE data directly
            res.write(chunk);
        }
    } finally {
        reader.releaseLock();
    }

    return accumulatedResponse;
}

// Main handler
export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Log environment check for debugging
    console.log('[API] Handler started');
    console.log('[API] GROQ_API_KEY exists:', !!process.env.GROQ_API_KEY);
    console.log('[API] GEMINI_API_KEY exists:', !!process.env.GEMINI_API_KEY);
    console.log('[API] MONGODB_URI exists:', !!process.env.MONGODB_URI);

    // Only allow POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const GROQ_API_KEY = process.env.GROQ_API_KEY;
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

    // Check at least one API key is configured
    if (!GROQ_API_KEY && !GEMINI_API_KEY) {
        console.error('No API keys configured (GROQ_API_KEY or GEMINI_API_KEY)');
        return res.status(500).json({ error: 'Server configuration error: No API keys' });
    }

    try {
        const {
            message,
            model = 'auto',
            history = [],
            sessionId,
            options = {}
        } = req.body;

        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }

        console.log(`[API] Request: model=${model}, sessionId=${sessionId}, messageLength=${message.length}`);

        // Connect to MongoDB (optional - won't fail if not configured)
        let db = null;
        try {
            const connection = await connectToDatabase();
            db = connection?.db ?? null;

            // Save USER message if sessionId is present
            if (sessionId && db) {
                const messagesCollection = db.collection('messages');
                await messagesCollection.insertOne({
                    messageId: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                    sessionId,
                    role: 'user',
                    content: message,
                    timestamp: new Date(),
                    model
                });

                await db.collection('sessions').updateOne(
                    { sessionId },
                    {
                        $set: { updatedAt: new Date() },
                        $setOnInsert: {
                            title: message.substring(0, 50) + (message.length > 50 ? '...' : ''),
                            createdAt: new Date(),
                            model
                        }
                    },
                    { upsert: true }
                );
                console.log('✅ User message saved to DB');
            }
        } catch (_error) {
            console.warn('⚠️ Failed to save user message to DB:', _error);
        }

        // Build system instruction with options
        let fullSystemInstruction = SYSTEM_INSTRUCTION;

        if (options.responseStyle === 'concise') {
            fullSystemInstruction += '\n\nRespond concisely in 2-3 sentences focusing on the key answer.';
        } else if (options.responseStyle === 'detailed') {
            fullSystemInstruction += '\n\nProvide a detailed, step-by-step explanation.';
        }

        if (options.deepThink) {
            fullSystemInstruction += `\n\n## DEEP THINKING MODE ACTIVATED:
You must think carefully and thoroughly before answering.

Format your response as:
<thinking>
[Write your detailed reasoning process here]
</thinking>

<answer>
[Provide your final answer here]
</answer>`;
        }

        if (options.memoryContext) {
            fullSystemInstruction += `\n\n${options.memoryContext}`;
        }

        if (options.documentContext) {
            fullSystemInstruction += `\n\n[DOCUMENT CONTEXT]\n${options.documentContext}\n[END DOCUMENT CONTEXT]`;
        }

        // Set headers for SSE streaming
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('Access-Control-Allow-Origin', '*');

        let accumulatedResponse = '';
        let usedProvider = '';

        // Determine which API to use based on model selection
        const useGroqPrimary = isGroqModel(model) && GROQ_API_KEY;
        const useGeminiPrimary = isGeminiModel(model) && GEMINI_API_KEY;

        if (useGeminiPrimary) {
            // User explicitly selected a Gemini model - use Gemini directly
            console.log(`[API] Using Gemini API for model: ${model}`);
            const geminiResponse = await callGeminiAPI(
                GEMINI_API_KEY!,
                model,
                fullSystemInstruction,
                message,
                history,
                options.enableWebSearch || false
            );

            if (geminiResponse.ok) {
                usedProvider = 'gemini';
                accumulatedResponse = await streamGeminiResponse(geminiResponse, res);
                console.log('[API] ✅ Gemini API succeeded');
            } else {
                const error = await geminiResponse.json();
                throw new Error(error.error?.message || 'Gemini API error');
            }
        } else if (useGroqPrimary) {
            // Groq model or 'auto' - use Groq with Gemini fallback
            try {
                const groqModel = getGroqModel(model);
                console.log(`[API] Using Groq API with model: ${groqModel}`);
                const groqResponse = await callGroqAPI(
                    GROQ_API_KEY!,
                    model,
                    fullSystemInstruction,
                    message,
                    history
                );

                if (groqResponse.ok) {
                    usedProvider = 'groq';
                    accumulatedResponse = await streamGroqResponse(groqResponse, res);
                    console.log('[API] ✅ Groq API succeeded');
                } else {
                    const errorData = await groqResponse.json();
                    console.warn('[API] ⚠️ Groq API failed:', errorData);
                    throw new Error(errorData.error?.message || 'Groq API error');
                }
            } catch (groqError) {
                console.warn('[API] Groq failed, trying Gemini fallback...', groqError);

                // Fallback to Gemini if available
                if (GEMINI_API_KEY) {
                    const fallbackModel = getGeminiModel(model);
                    console.log(`[API] Falling back to Gemini with model: ${fallbackModel}`);
                    const geminiResponse = await callGeminiAPI(
                        GEMINI_API_KEY,
                        fallbackModel,
                        fullSystemInstruction,
                        message,
                        history,
                        options.enableWebSearch || false
                    );

                    if (geminiResponse.ok) {
                        usedProvider = 'gemini';
                        accumulatedResponse = await streamGeminiResponse(geminiResponse, res);
                        console.log('[API] ✅ Gemini fallback succeeded');
                    } else {
                        const error = await geminiResponse.json();
                        throw new Error(error.error?.message || 'Both APIs failed');
                    }
                } else {
                    throw groqError;
                }
            }
        } else if (GEMINI_API_KEY) {
            // Fallback: No Groq key but Gemini is available
            const fallbackModel = getGeminiModel(model);
            console.log(`[API] Using Gemini API (Groq not configured) with model: ${fallbackModel}`);
            const geminiResponse = await callGeminiAPI(
                GEMINI_API_KEY,
                fallbackModel,
                fullSystemInstruction,
                message,
                history,
                options.enableWebSearch || false
            );

            if (geminiResponse.ok) {
                usedProvider = 'gemini';
                accumulatedResponse = await streamGeminiResponse(geminiResponse, res);
                console.log('[API] ✅ Gemini API succeeded');
            } else {
                const error = await geminiResponse.json();
                throw new Error(error.error?.message || 'Gemini API error');
            }
        } else {
            throw new Error('No suitable API available for the requested model');
        }

        // Save assistant message to DB
        if (sessionId && db && accumulatedResponse) {
            try {
                const messagesCollection = db.collection('messages');
                await messagesCollection.insertOne({
                    messageId: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                    sessionId,
                    role: 'assistant',
                    content: accumulatedResponse,
                    timestamp: new Date(),
                    model,
                    provider: usedProvider
                });

                await db.collection('sessions').updateOne(
                    { sessionId },
                    { $set: { updatedAt: new Date() } }
                );

                console.log('✅ Assistant message saved to DB');
            } catch (dbError) {
                console.error('⚠️ Failed to save assistant message to DB:', dbError);
            }
        }

        res.end();

    } catch (error) {
        console.error('[API] Error:', error);
        return res.status(500).json({
            error: error instanceof Error ? error.message : 'Internal server error'
        });
    }
}
