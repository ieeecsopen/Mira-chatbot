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

// Gemini models - Primary (used by default)
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

// Default Gemini model for 'auto' selection
const DEFAULT_GEMINI_MODEL = 'gemini-2.0-flash';

// Groq models - Fallback when Gemini fails
const GROQ_MODELS = [
    'llama-3.3-70b-versatile',
    'llama-3.1-8b-instant',
    'meta-llama/llama-4-maverick-17b-128e-instruct',
    'meta-llama/llama-4-scout-17b-16e-instruct',
    'moonshotai/kimi-k2-instruct',
    'qwen/qwen3-32b',
    'openai/gpt-oss-120b',
    'openai/gpt-oss-20b',
];

// Default Groq model for fallback
const DEFAULT_GROQ_MODEL = 'llama-3.3-70b-versatile';

// Helper to check if a model is a Gemini model
function isGeminiModel(model: string): boolean {
    return GEMINI_MODELS.includes(model) || model === 'auto';
}

// Helper to check if a model is a Groq model
function isGroqModel(model: string): boolean {
    return GROQ_MODELS.includes(model);
}

// Get the actual Gemini model to use
function getGeminiModel(model: string): string {
    if (model === 'auto') return DEFAULT_GEMINI_MODEL;
    return GEMINI_MODELS.includes(model) ? model : DEFAULT_GEMINI_MODEL;
}

// Get the actual Groq model to use (for fallback)
function getGroqModel(model: string): string {
    return GROQ_MODELS.includes(model) ? model : DEFAULT_GROQ_MODEL;
}

// System instruction for Gemini (primary)
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

// Enhanced system instruction for Groq/LLaMA models (fallback)
// More explicit and detailed to help these models generate better Sinhala responses
const GROQ_SYSTEM_INSTRUCTION = `You are "MIRA" (මීරා), a Sinhala language AI assistant from Sri Lanka.

## CRITICAL INSTRUCTIONS:
1. **ALWAYS respond in Sinhala (සිංහල)** - Use Sinhala Unicode script (අ, ආ, ඉ, ඊ, උ, ඌ, එ, ඒ, ඔ, ඕ, ක, ඛ, ග, ඝ, etc.)
2. **NEVER respond in English** - Even if the user writes in English, respond in Sinhala
3. **NEVER use Romanized Sinhala** - Don't write "ayubowan", write "ආයුබෝවන්"

## Your Identity:
- Your name is "මීරා" (MIRA - Multilingual Intelligent Response Assistant)
- You are a Sri Lankan AI assistant
- You are NOT Google, Gemini, ChatGPT, LLaMA, or any other AI
- If asked who you are, say: "මම මීරා. මම සිංහල භාෂාවෙන් උදව් කිරීමට සැලසුම් කර ඇති AI සහායකයෙක්."

## Language Guidelines:
Use Sinhala equivalents for English technical terms:
- Computer → පරිගණකය
- Internet → අන්තර්ජාලය
- Software → මෘදුකාංගය
- Download → බාගත කරන්න
- Website → වෙබ් අඩවිය
- Email → විද්‍යුත් තැපෑල
- Password → මුරපදය
- File → ගොනුව
- Search → සෙවීම
- Phone → දුරකථනය
- Application → යෙදුම
- Message → පණිවිඩය

## Response Format:
- Be friendly and respectful (use "ඔබ" not "ඔයා")
- Keep responses clear and well-structured
- Use bullet points (•) for lists
- Start greetings with "ආයුබෝවන්!"
- End with helpful phrases like "තවත් උදව් අවශ්‍ය නම් අසන්න."

## Example Response Format:
User: "What is AI?"
You: "ආයුබෝවන්! කෘත්‍රිම බුද්ධිය (AI) යනු පරිගණක පද්ධති මගින් මිනිස් බුද්ධියට සමාන කාර්යයන් සිදු කිරීමේ හැකියාවයි. මෙයට ඇතුළත් වන්නේ:
• ඉගෙනීම
• තීරණ ගැනීම
• ගැටලු විසඳීම
• භාෂාව තේරුම් ගැනීම

තවත් ප්‍රශ්න ඇත්නම් අසන්න!"`;

// Get appropriate system instruction based on provider
function getSystemInstruction(provider: 'gemini' | 'groq'): string {
    return provider === 'groq' ? GROQ_SYSTEM_INSTRUCTION : SYSTEM_INSTRUCTION;
}

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
    // Wrap everything in try-catch to catch any early errors
    try {
        // Log environment check for debugging
        console.log('[API] Handler started, method:', req.method);
        console.log('[API] GROQ_API_KEY exists:', !!process.env.GROQ_API_KEY);
        console.log('[API] GEMINI_API_KEY exists:', !!process.env.GEMINI_API_KEY);
        console.log('[API] MONGODB_URI exists:', !!process.env.MONGODB_URI);

        // CORS headers for all responses
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

        // Handle preflight requests
        if (req.method === 'OPTIONS') {
            return res.status(200).end();
        }

        // Only allow POST
        if (req.method !== 'POST') {
            return res.status(405).json({ error: 'Method not allowed' });
        }

        const GROQ_API_KEY = process.env.GROQ_API_KEY;
        const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

        // Check at least one API key is configured
        if (!GROQ_API_KEY && !GEMINI_API_KEY) {
            console.error('No API keys configured (GROQ_API_KEY or GEMINI_API_KEY)');
            return res.status(500).json({ error: 'Server configuration error: No API keys configured. Please add GROQ_API_KEY or GEMINI_API_KEY to your environment variables.' });
        }

        // Parse body if it's a string (Vercel sometimes sends it as string)
        let body: ChatRequestBody;
        if (typeof req.body === 'string') {
            try {
                body = JSON.parse(req.body);
            } catch {
                return res.status(400).json({ error: 'Invalid JSON in request body' });
            }
        } else if (req.body && typeof req.body === 'object') {
            body = req.body as ChatRequestBody;
        } else {
            return res.status(400).json({ error: 'Request body is required' });
        }

        const {
            message,
            model = 'auto',
            history = [],
            sessionId,
            options = {}
        } = body;


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

        // Build system instruction with options (for Gemini - primary)
        let fullSystemInstruction = SYSTEM_INSTRUCTION;
        // Build enhanced system instruction for Groq (fallback)
        let groqFullSystemInstruction = GROQ_SYSTEM_INSTRUCTION;

        if (options.responseStyle === 'concise') {
            fullSystemInstruction += '\n\nRespond concisely in 2-3 sentences focusing on the key answer.';
            groqFullSystemInstruction += '\n\n## RESPONSE STYLE: CONCISE\nRespond concisely in 2-3 sentences focusing on the key answer. Keep it brief but informative.';
        } else if (options.responseStyle === 'detailed') {
            fullSystemInstruction += '\n\nProvide a detailed, step-by-step explanation.';
            groqFullSystemInstruction += '\n\n## RESPONSE STYLE: DETAILED\nProvide a detailed, step-by-step explanation in Sinhala. Be thorough and comprehensive.';
        }

        if (options.deepThink) {
            const deepThinkPrompt = `\n\n## DEEP THINKING MODE ACTIVATED:
You must think carefully and thoroughly before answering.

Format your response as:
<thinking>
[Write your detailed reasoning process here]
</thinking>

<answer>
[Provide your final answer here]
</answer>`;
            fullSystemInstruction += deepThinkPrompt;
            groqFullSystemInstruction += deepThinkPrompt;
        }

        if (options.memoryContext) {
            fullSystemInstruction += `\n\n${options.memoryContext}`;
            groqFullSystemInstruction += `\n\n${options.memoryContext}`;
        }

        if (options.documentContext) {
            fullSystemInstruction += `\n\n[DOCUMENT CONTEXT]\n${options.documentContext}\n[END DOCUMENT CONTEXT]`;
            groqFullSystemInstruction += `\n\n[DOCUMENT CONTEXT - Use this information to answer in Sinhala]\n${options.documentContext}\n[END DOCUMENT CONTEXT]`;
        }

        // Set headers for SSE streaming
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('Access-Control-Allow-Origin', '*');

        let accumulatedResponse = '';
        let usedProvider = '';

        // Determine which API to use based on model selection
        const useGeminiPrimary = isGeminiModel(model) && GEMINI_API_KEY;
        const useGroqPrimary = isGroqModel(model) && GROQ_API_KEY;

        if (useGeminiPrimary) {
            // Gemini model or 'auto' - use Gemini with Groq fallback
            try {
                const geminiModel = getGeminiModel(model);
                console.log(`[API] Using Gemini API with model: ${geminiModel}`);
                const geminiResponse = await callGeminiAPI(
                    GEMINI_API_KEY!,
                    geminiModel,
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
                    const errorData = await geminiResponse.json();
                    console.warn('[API] ⚠️ Gemini API failed:', errorData);
                    throw new Error(errorData.error?.message || 'Gemini API error');
                }
            } catch (geminiError) {
                console.warn('[API] Gemini failed, trying Groq fallback...', geminiError);

                // Fallback to Groq if available
                if (GROQ_API_KEY) {
                    const fallbackModel = getGroqModel(model);
                    console.log(`[API] Falling back to Groq with model: ${fallbackModel}`);
                    const groqResponse = await callGroqAPI(
                        GROQ_API_KEY,
                        fallbackModel,
                        groqFullSystemInstruction,
                        message,
                        history
                    );

                    if (groqResponse.ok) {
                        usedProvider = 'groq';
                        accumulatedResponse = await streamGroqResponse(groqResponse, res);
                        console.log('[API] ✅ Groq fallback succeeded');
                    } else {
                        const error = await groqResponse.json();
                        throw new Error(error.error?.message || 'Both APIs failed');
                    }
                } else {
                    throw geminiError;
                }
            }
        } else if (useGroqPrimary) {
            // User explicitly selected a Groq model - use Groq directly
            const groqModel = getGroqModel(model);
            console.log(`[API] Using Groq API for model: ${groqModel}`);
            const groqResponse = await callGroqAPI(
                GROQ_API_KEY!,
                groqModel,
                groqFullSystemInstruction,
                message,
                history
            );

            if (groqResponse.ok) {
                usedProvider = 'groq';
                accumulatedResponse = await streamGroqResponse(groqResponse, res);
                console.log('[API] ✅ Groq API succeeded');
            } else {
                const error = await groqResponse.json();
                throw new Error(error.error?.message || 'Groq API error');
            }
        } else if (GROQ_API_KEY) {
            // Fallback: No Gemini key but Groq is available
            const fallbackModel = getGroqModel(model);
            console.log(`[API] Using Groq API (Gemini not configured) with model: ${fallbackModel}`);
            const groqResponse = await callGroqAPI(
                GROQ_API_KEY,
                fallbackModel,
                groqFullSystemInstruction,
                message,
                history
            );

            if (groqResponse.ok) {
                usedProvider = 'groq';
                accumulatedResponse = await streamGroqResponse(groqResponse, res);
                console.log('[API] ✅ Groq API succeeded');
            } else {
                const error = await groqResponse.json();
                throw new Error(error.error?.message || 'Groq API error');
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
