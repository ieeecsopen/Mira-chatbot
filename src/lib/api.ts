const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

// Import Sinhala language utilities
import { singlishToSinhala, detectSinglish } from './singlish';
import { correctGrammar, enhanceSinhalaText } from './grammar';
import { buildRAGContext, getDirectAnswer } from './rag';

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

export async function sendMessage(userId: string, message: string): Promise<ChatResponse> {
    // Preprocess the message
    const { processed, wasSinglish, ragContext, directAnswer } = preprocessMessage(message);
    
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
                            text: enhancedMessage,
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
    let answer = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response received';
    
    // Post-process the response
    answer = postprocessResponse(answer);

    return {
        answer,
        sources: ragContext ? ['Sinhala Knowledge Base'] : [],
        confidence: ragContext ? 'high' : 'medium',
        rag_used: !!ragContext,
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
        // Preprocess the message
        const { processed, wasSinglish, ragContext, directAnswer } = preprocessMessage(message);
        
        // Log Singlish conversion if applicable
        if (wasSinglish) {
            console.log('🔄 Singlish converted:', message, '→', processed);
        }
        
        // If we have a direct answer, stream it character by character
        if (directAnswer) {
            console.log('📚 Direct answer from knowledge base');
            const answer = postprocessResponse(directAnswer);
            
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
        const enhancedMessage = buildEnhancedPrompt(processed, ragContext);
        if (ragContext) {
            console.log('📚 RAG context added to prompt');
        }

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
                                text: enhancedMessage,
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
