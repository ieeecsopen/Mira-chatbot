import type { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';
import chatHandler from '../../api/chat';
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

// Create a mock response object that supports SSE streaming
function createVercelResponse(callback: (error: any, response: any) => void): VercelResponse {
  const headers: Record<string, string> = {};
  let statusCode = 200;
  let responseBody: string = '';
  let callbackCalled = false;

  const res = {
    status: (code: number) => {
      statusCode = code;
      return res;
    },
    json: (data: any) => {
      if (callbackCalled) return res;
      callbackCalled = true;
      headers['content-type'] = 'application/json';
      callback(null, {
        statusCode,
        headers,
        body: JSON.stringify(data),
      });
      return res;
    },
    send: (data: any) => {
      if (callbackCalled) return res;
      callbackCalled = true;
      callback(null, {
        statusCode,
        headers,
        body: typeof data === 'string' ? data : JSON.stringify(data),
      });
      return res;
    },
    // Important: write() is used for SSE streaming - accumulate all chunks
    write: (chunk: any) => {
      const data = typeof chunk === 'string' ? chunk : chunk.toString();
      responseBody += data;
      return true;
    },
    setHeader: (key: string, value: string) => {
      headers[key.toLowerCase()] = value;
      return res;
    },
    getHeader: (key: string) => headers[key.toLowerCase()],
    end: (data?: any) => {
      if (callbackCalled) return res;
      callbackCalled = true;
      // Combine any final data with accumulated response body
      const finalBody = data ? responseBody + (typeof data === 'string' ? data : data.toString()) : responseBody;
      callback(null, {
        statusCode,
        headers,
        body: finalBody,
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

    chatHandler(vercelReq, vercelRes).catch(reject);
  });
};
