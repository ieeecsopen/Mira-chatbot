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
    setHeader: (name: string, value: string) => this;
    end: (chunk?: any) => this;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Only allow POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

    if (!GEMINI_API_KEY) {
        console.error('GEMINI_API_KEY not configured');
        return res.status(500).json({ error: 'Server configuration error' });
    }

    try {
        const { text, type = 'search_document' } = req.body;

        if (!text) {
            return res.status(400).json({ error: 'Text is required' });
        }

        // Use text-embedding-004 model
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: 'models/text-embedding-004',
                    content: {
                        parts: [{ text: text }]
                    },
                    taskType: type === 'search_query' ? 'RETRIEVAL_QUERY' : 'RETRIEVAL_DOCUMENT'
                })
            }
        );

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Gemini Embedding Error:', errorData);
            return res.status(response.status).json({ error: errorData.error?.message || 'Failed to generate embedding' });
        }

        const data = await response.json();

        // Extract embedding vector
        const embedding = data.embedding?.values;

        if (!embedding) {
            return res.status(500).json({ error: 'No embedding returned from API' });
        }

        return res.status(200).json({ embedding });

    } catch (error) {
        console.error('Embedding API Error:', error);
        return res.status(500).json({ error: error instanceof Error ? error.message : 'Internal server error' });
    }
}
