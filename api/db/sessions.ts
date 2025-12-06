import type { IncomingMessage, ServerResponse } from 'http';
import { ObjectId } from 'mongodb';
import { getDatabase } from './connect';

// Vercel serverless function types
interface VercelRequest extends IncomingMessage {
    body: any;
    query: { [key: string]: string | string[] };
    method?: string;
}

interface VercelResponse extends ServerResponse {
    status: (statusCode: number) => VercelResponse;
    json: (body: any) => void;
}

// Session schema
export interface DbSession {
    _id?: ObjectId;
    sessionId: string;
    title: string;
    model: string;
    createdAt: Date;
    updatedAt: Date;
    userId?: string;
}

const COLLECTION = 'sessions';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).json({});
    }

    try {
        const db = await getDatabase();
        const collection = db.collection<DbSession>(COLLECTION);

        // GET - List all sessions or get single session
        if (req.method === 'GET') {
            const sessionId = req.query.id as string | undefined;
            const limit = parseInt(req.query.limit as string) || 50;
            const offset = parseInt(req.query.offset as string) || 0;

            if (sessionId) {
                // Get single session
                const session = await collection.findOne({ sessionId });
                if (!session) {
                    return res.status(404).json({ error: 'Session not found' });
                }
                return res.status(200).json(session);
            } else {
                // List all sessions, sorted by updatedAt desc
                const sessions = await collection
                    .find({})
                    .sort({ updatedAt: -1 })
                    .skip(offset)
                    .limit(limit)
                    .toArray();

                const total = await collection.countDocuments();
                return res.status(200).json({ sessions, total, limit, offset });
            }
        }

        // POST - Create new session
        if (req.method === 'POST') {
            const { sessionId, title, model, userId } = req.body;

            if (!sessionId) {
                return res.status(400).json({ error: 'sessionId is required' });
            }

            const session: DbSession = {
                sessionId,
                title: title || 'New Chat',
                model: model || 'gemini-2.0-flash',
                createdAt: new Date(),
                updatedAt: new Date(),
                userId,
            };

            await collection.insertOne(session);
            console.log(`[DB] Created session: ${sessionId}`);
            return res.status(201).json(session);
        }

        // PUT - Update session
        if (req.method === 'PUT') {
            const { sessionId, title, model } = req.body;

            if (!sessionId) {
                return res.status(400).json({ error: 'sessionId is required' });
            }

            const updateFields: Partial<DbSession> = { updatedAt: new Date() };
            if (title !== undefined) updateFields.title = title;
            if (model !== undefined) updateFields.model = model;

            const result = await collection.updateOne(
                { sessionId },
                { $set: updateFields }
            );

            if (result.matchedCount === 0) {
                return res.status(404).json({ error: 'Session not found' });
            }

            console.log(`[DB] Updated session: ${sessionId}`);
            return res.status(200).json({ success: true, sessionId });
        }

        // DELETE - Delete session
        if (req.method === 'DELETE') {
            const sessionId = req.query.id as string || req.body?.sessionId;

            if (!sessionId) {
                return res.status(400).json({ error: 'sessionId is required' });
            }

            // Delete session
            await collection.deleteOne({ sessionId });

            // Also delete all messages for this session
            const messagesCollection = db.collection('messages');
            await messagesCollection.deleteMany({ sessionId });

            console.log(`[DB] Deleted session and messages: ${sessionId}`);
            return res.status(200).json({ success: true, sessionId });
        }

        return res.status(405).json({ error: 'Method not allowed' });

    } catch (error) {
        console.error('[DB Sessions] Error:', error);
        return res.status(500).json({
            error: error instanceof Error ? error.message : 'Internal server error'
        });
    }
}
