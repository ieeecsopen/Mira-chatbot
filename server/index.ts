import 'dotenv/config';
import express, { type NextFunction, type Request, type Response } from 'express';
import cors from 'cors';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import authHandler from '../api/auth';
import chatHandler from '../api/chat';
import embeddingsHandler from '../api/embeddings';

// Handle Environment Variables
if (!process.env.GEMINI_API_KEY && process.env.VITE_GEMINI_API_KEY) {
	console.log('⚠️ GEMINI_API_KEY not found, using VITE_GEMINI_API_KEY');
	process.env.GEMINI_API_KEY = process.env.VITE_GEMINI_API_KEY;
}

if (!process.env.GROQ_API_KEY && process.env.VITE_GROQ_API_KEY) {
	console.log('⚠️ GROQ_API_KEY not found, using VITE_GROQ_API_KEY');
	process.env.GROQ_API_KEY = process.env.VITE_GROQ_API_KEY;
}

if (process.env.GROQ_API_KEY) {
	console.log('✅ GROQ_API_KEY configured');
} else {
	console.log('⚠️ GROQ_API_KEY not configured - Groq models will not work');
}

if (process.env.GEMINI_API_KEY) {
	console.log('✅ GEMINI_API_KEY configured');
} else {
	console.log('⚠️ GEMINI_API_KEY not configured - Gemini fallback will not work');
}

const app = express();
const port = Number(process.env.API_PORT) || 8000;
const corsOrigins = process.env.CORS_ORIGIN?.split(',').map((origin) => origin.trim()).filter(Boolean);

app.use(
	cors({
		origin: corsOrigins && corsOrigins.length > 0 ? corsOrigins : true,
		credentials: true,
	})
);

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

function normalizeQuery(query: Request['query']): Record<string, string | string[]> {
	const normalized: Record<string, string | string[]> = {};

	for (const [key, value] of Object.entries(query)) {
		if (value === undefined || value === null) {
			continue;
		}

		if (Array.isArray(value)) {
			normalized[key] = value.map((entry) => String(entry));
			continue;
		}

		if (typeof value === 'object') {
			normalized[key] = JSON.stringify(value);
			continue;
		}

		normalized[key] = String(value);
	}

	return normalized;
}

function toVercelRequest(req: Request): VercelRequest {
	const vercelReq = req as unknown as VercelRequest;
	vercelReq.query = normalizeQuery(req.query);
	vercelReq.body = req.body;
	return vercelReq;
}

function toVercelResponse(res: Response): VercelResponse {
	return res as unknown as VercelResponse;
}

type VercelHandler = (req: VercelRequest, res: VercelResponse) => void | Promise<void> | Promise<VercelResponse>;

function wrap(handler: VercelHandler) {
	return async (req: Request, res: Response, next: NextFunction) => {
		try {
			await handler(toVercelRequest(req), toVercelResponse(res));
		} catch (error) {
			next(error);
		}
	};
}

app.all('/api/auth', wrap(authHandler));
app.all('/api/chat', wrap(chatHandler));
app.all('/api/embeddings', wrap(embeddingsHandler));

app.get('/healthz', (_req, res) => {
	res.json({ status: 'ok', timestamp: Date.now() });
});

app.use((error: Error, _req: Request, res: Response, _next: NextFunction) => {
	console.error('[API] Unhandled error', error);
	if (res.headersSent) {
		return;
	}
	res.status(500).json({ error: error.message || 'Internal server error' });
});

app.listen(port, () => {
	console.log(`➡️  API server ready on http://127.0.0.1:${port}`);
});