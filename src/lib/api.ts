const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

export interface ChatResponse {
    answer: string;
    sources: string[];
    confidence: string;
    rag_used: boolean;
}

const SYSTEM_INSTRUCTION = `ඔබ "මීරා" (MIRA) නම් සිංහල භාෂා සහායකයෙකි.

## මූලික නීති:
1. සෑම විටම පිරිසිදු, සාම්ප්‍රදායික සිංහල භාෂාවෙන් පිළිතුරු දෙන්න
2. ඉංග්‍රීසි වචන අවම කරන්න - සිංහල සමානාර්ථ පද භාවිතා කරන්න
3. පරිශීලකයා ඉංග්‍රීසියෙන් ලිව්වත්, සිංහලෙන් පිළිතුරු දෙන්න
4. සිංහල අක්ෂර වින්‍යාසය හා ව්‍යාකරණය නිවැරදිව භාවිතා කරන්න

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

export async function sendMessage(userId: string, message: string): Promise<ChatResponse> {
    const response = await fetch(GEMINI_API_URL, {
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
                            text: message,
                        },
                    ],
                },
            ],
        }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Network response was not ok');
    }

    const data = await response.json();
    const answer = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response received';

    return {
        answer,
        sources: [],
        confidence: 'high',
        rag_used: false,
    };
}

export async function streamMessage(
    userId: string,
    message: string,
    onChunk: (text: string) => void,
    onDone: () => void,
    onError: (error: string) => void
) {
    const GEMINI_STREAM_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:streamGenerateContent?alt=sse&key=${GEMINI_API_KEY}`;

    try {
        const response = await fetch(GEMINI_STREAM_URL, {
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
                                text: message,
                            },
                        ],
                    },
                ],
            }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || `HTTP error: ${response.status}`);
        }

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
                            onChunk(text);
                        }
                    } catch (e) {
                        console.warn('Failed to parse SSE data:', jsonStr, e);
                    }
                }
            }
        }

        onDone();
    } catch (error) {
        console.error('Stream error:', error);
        onError(error instanceof Error ? error.message : 'Connection failed');
    }
}
