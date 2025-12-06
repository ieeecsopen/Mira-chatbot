import type { IncomingMessage, ServerResponse } from 'http';

// Vercel serverless function types
interface VercelRequest extends IncomingMessage {
    body: any;
    query: { [key: string]: string | string[] };
    method?: string;
}

interface VercelResponse extends ServerResponse {
    status: (statusCode: number) => VercelResponse;
    json: (body: any) => void;
    setHeader: (name: string, value: string) => VercelResponse;
    write: (chunk: any, callback?: (error: Error | null | undefined) => void) => boolean;
    end: (chunk?: any) => VercelResponse;
}

// Get API key from server environment (not exposed to client)
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
- සරල, තේරුම් ගැනීමට පහසු භාෂාව භාවිතා කරන්න`;

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Only allow POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

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
            options = {}
        } = req.body;

        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }

        console.log(`[API] Request: model=${model}, messageLength=${message.length}, historyLength=${history.length}`);

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

        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                // Forward the SSE data directly
                res.write(chunk);
            }
        } finally {
            reader.releaseLock();
        }

        res.end();

    } catch (error) {
        console.error('[API] Error:', error);
        return res.status(500).json({
            error: error instanceof Error ? error.message : 'Internal server error'
        });
    }
}
