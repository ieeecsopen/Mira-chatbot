import type { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';
import embeddingsHandler from '../../api/embeddings';
import type { VercelRequest, VercelResponse } from '@vercel/node';

// Convert Netlify event to Vercel request format
function toVercelRequest(event: HandlerEvent): VercelRequest {
  const query: Record<string, string | string[]> = {};
  
  if (event.queryStringParameters) {
    for (const [key, value] of Object.entries(event.queryStringParameters)) {
      if (value !== null && value !== undefined) {
        query[key] = value;
      }
    }
  }

  let body: any = event.body;
  if (event.body && event.headers['content-type']?.includes('application/json')) {
    try {
      body = JSON.parse(event.body);
    } catch (e) {
      // Keep as string if not valid JSON
    }
  }

  return {
    query,
    body,
    headers: event.headers as Record<string, string>,
    method: event.httpMethod,
    url: event.path,
  } as VercelRequest;
}

// Create a mock response object
function createVercelResponse(callback: (error: any, response: any) => void): VercelResponse {
  const headers: Record<string, string> = {};
  let statusCode = 200;
  let responseBody: any;

  const res = {
    status: (code: number) => {
      statusCode = code;
      return res;
    },
    json: (data: any) => {
      responseBody = data;
      headers['content-type'] = 'application/json';
      callback(null, {
        statusCode,
        headers,
        body: JSON.stringify(data),
      });
      return res;
    },
    send: (data: any) => {
      responseBody = data;
      callback(null, {
        statusCode,
        headers,
        body: typeof data === 'string' ? data : JSON.stringify(data),
      });
      return res;
    },
    setHeader: (key: string, value: string) => {
      headers[key.toLowerCase()] = value;
      return res;
    },
    getHeader: (key: string) => headers[key.toLowerCase()],
    end: (data?: any) => {
      callback(null, {
        statusCode,
        headers,
        body: data || responseBody || '',
      });
      return res;
    },
  } as VercelResponse;

  return res;
}

export const handler: Handler = async (event: HandlerEvent, context: HandlerContext): Promise<HandlerResponse> => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
      body: '',
    };
  }

  return new Promise((resolve, reject) => {
    const vercelReq = toVercelRequest(event);
    const vercelRes = createVercelResponse((error, response) => {
      if (error) {
        reject(error);
      } else {
        resolve({
          ...response,
          headers: {
            ...response.headers,
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          },
        });
      }
    });

    embeddingsHandler(vercelReq, vercelRes).catch(reject);
  });
};
