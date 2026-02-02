import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
    res.status(200).json({
        status: 'ok',
        message: 'Vercel function is working!',
        timestamp: new Date().toISOString(),
        env: {
            NODE_ENV: process.env.NODE_ENV,
            HAS_MONGO_URI: !!process.env.MONGODB_URI,
            HAS_GEMINI_KEY: !!process.env.GEMINI_API_KEY
        }
    });
}
