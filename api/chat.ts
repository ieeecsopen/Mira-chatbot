import type { IncomingMessage, ServerResponse } from 'http';
import { connectToDatabase } from './db/connect';
import { ObjectId } from 'mongodb';

// Vercel serverless function types
interface VercelRequest extends IncomingMessage {
    body: any;
    query: { [key: string]: string | string[] };
    method?: string;
}

interface VercelResponse extends ServerResponse {
    status: (statusCode: number) => VercelResponse;
    json: (body: any) => void;
    setHeader: (name: string, value: string) => this;
    end: (chunk?: any) => this;
}

// Get API key from server environment (not exposed to client)
export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Only allow POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

    // System instruction (same as frontend)
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

    // Check API key
    if (!GEMINI_API_KEY) {
        console.error('GEMINI_API_KEY not configured');
        return res.status(500).json({ error: 'Server configuration error' });
    }

    try {
        const {
            message,
            model = 'gemini-2.0-flash',
            history = [],
            sessionId,
            options = {}
        } = req.body;

        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }

        console.log(`[API] Request: model=${model}, sessionId=${sessionId}, messageLength=${message.length}`);

        // Connect to MongoDB
        let db = null;
        try {
            const connection = await connectToDatabase();
            db = connection.db;

            // 1. Save USER message if sessionId is present
            if (sessionId && db) {
                const messagesCollection = db.collection('messages');
                await messagesCollection.insertOne({
                    messageId: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                    sessionId,
                    role: 'user',
                    content: message,
                    timestamp: new Date(),
                    model // Track which model was requested
                });

                // Update session timestamp
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
                console.log('✅ Pending User message saved to DB');
            }
        } catch (error) {
            console.warn('⚠️ Failed to save user message to DB:', error);
            // Continue execution - don't fail chat if DB is down
        }

        // Build conversation history
        const historyContents = history.map((msg: { role: string; content: string }) => ({
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: msg.content }]
        }));

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

        // Build request body
        const requestBody: any = {
            system_instruction: {
                parts: [{ text: fullSystemInstruction }]
            },
            contents: [
                ...historyContents,
                {
                    role: 'user',
                    parts: [{ text: message }]
                }
            ],
        };

        // Add Google Search tool if enabled
        if (options.enableWebSearch) {
            requestBody.tools = [{ googleSearch: {} }];
        }

        // Make streaming request to Gemini
        const streamUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${GEMINI_API_KEY}`;

        const geminiResponse = await fetch(streamUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
        });

        if (!geminiResponse.ok) {
            const error = await geminiResponse.json();
            console.error('[API] Gemini error:', error);
            return res.status(geminiResponse.status).json({
                error: error.error?.message || 'Gemini API error'
            });
        }

        // Set headers for SSE streaming
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('Access-Control-Allow-Origin', '*');

        // Stream the response
        const reader = geminiResponse.body?.getReader();
        if (!reader) {
            return res.status(500).json({ error: 'Failed to read response' });
        }

        const decoder = new TextDecoder();
        let accumulatedResponse = '';

        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });

                // Save accumulation logic
                const lines = chunk.split('\n');
                for (const line of lines) {
                    if (line.startsWith('data:')) {
                        const jsonStr = line.slice(5).trim();
                        if (!jsonStr) continue;
                        try {
                            const data = JSON.parse(jsonStr);
                            const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
                            if (text) accumulatedResponse += text;
                        } catch (e) {
                            // ignore parse errors for partial chunks
                        }
                    }
                }

                // Forward the SSE data directly
                res.write(chunk);
            }
        } catch (streamError) {
            console.error('[API] Stream reading error:', streamError);
            throw streamError; // Re-throw to be caught by outer catch
        } finally {
            reader.releaseLock();
        }

        // 2. Save ASSISTANT message to DB after stream completes
        // CRITICAL: This MUST complete before res.end() is called
        if (sessionId && db && accumulatedResponse) {
            try {
                const messagesCollection = db.collection('messages');
                await messagesCollection.insertOne({
                    messageId: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                    sessionId,
                    role: 'assistant',
                    content: accumulatedResponse,
                    timestamp: new Date(),
                    model
                });

                // Update session timestamp again
                await db.collection('sessions').updateOne(
                    { sessionId },
                    { $set: { updatedAt: new Date() } }
                );

                console.log('✅ Assistant message saved to DB');
            } catch (dbError) {
                console.error('⚠️ Failed to save assistant message to DB:', dbError);
                // Don't throw - we already streamed the response successfully
            }
        }

        // End response AFTER all async operations complete
        res.end();

    } catch (error) {
        console.error('[API] Error:', error);
        return res.status(500).json({
            error: error instanceof Error ? error.message : 'Internal server error'
        });
    }
}
