const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

export interface ChatResponse {
    answer: string;
    sources: string[];
    confidence: string;
    rag_used: boolean;
}

const SYSTEM_INSTRUCTION = `You are a helpful assistant that ALWAYS responds in Sinhala (සිංහල) language. 
No matter what language the user writes in, you must reply in Sinhala. 
Be friendly, helpful, and provide accurate information in Sinhala.`;

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
