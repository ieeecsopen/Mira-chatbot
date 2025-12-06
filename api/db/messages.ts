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

// Message schema
export interface DbMessage {
    _id?: ObjectId;
    messageId: string;
    sessionId: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

const COLLECTION = 'messages';

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
        const collection = db.collection<DbMessage>(COLLECTION);

        // GET - Get messages for a session
        if (req.method === 'GET') {
            const sessionId = req.query.sessionId as string;
            const limit = parseInt(req.query.limit as string) || 50;
            const offset = parseInt(req.query.offset as string) || 0;

            if (!sessionId) {
                return res.status(400).json({ error: 'sessionId query param is required' });
            }

            // Get messages sorted by timestamp, with pagination from the end
            const total = await collection.countDocuments({ sessionId });

            // Calculate skip to get the most recent messages
            const skipCount = Math.max(0, total - offset - limit);

            const messages = await collection
                .find({ sessionId })
                .sort({ timestamp: 1 })
                .skip(skipCount)
                .limit(limit)
                .toArray();

            return res.status(200).json({ messages, total, limit, offset });
        }

        // POST - Add message(s) to session
        if (req.method === 'POST') {
            const { sessionId, messageId, role, content, messages } = req.body;

            // Batch insert
            if (messages && Array.isArray(messages)) {
                const docs: DbMessage[] = messages.map((msg: any) => ({
                    messageId: msg.messageId || msg.id,
                    sessionId: msg.sessionId || sessionId,
                    role: msg.role,
                    content: msg.content,
                    timestamp: new Date(msg.timestamp || Date.now()),
                }));

                await collection.insertMany(docs);

                // Update session's updatedAt
                const sessionsCollection = db.collection('sessions');
                await sessionsCollection.updateOne(
                    { sessionId },
                    { $set: { updatedAt: new Date() } }
                );

                console.log(`[DB] Inserted ${docs.length} messages for session: ${sessionId}`);
                return res.status(201).json({ success: true, count: docs.length });
            }

            // Single insert
            if (!sessionId || !messageId || !role || !content) {
                return res.status(400).json({ error: 'sessionId, messageId, role, and content are required' });
            }

            const message: DbMessage = {
                messageId,
                sessionId,
                role,
                content,
                timestamp: new Date(),
            };

            await collection.insertOne(message);

            // Update session's updatedAt
            const sessionsCollection = db.collection('sessions');
            await sessionsCollection.updateOne(
                { sessionId },
                { $set: { updatedAt: new Date() } }
            );

            console.log(`[DB] Inserted message ${messageId} for session: ${sessionId}`);
            return res.status(201).json(message);
        }

        // PUT - Update message content
        if (req.method === 'PUT') {
            const { messageId, content } = req.body;

            if (!messageId || !content) {
                return res.status(400).json({ error: 'messageId and content are required' });
            }

            const result = await collection.updateOne(
                { messageId },
                { $set: { content, timestamp: new Date() } }
            );

            if (result.matchedCount === 0) {
                return res.status(404).json({ error: 'Message not found' });
            }

            console.log(`[DB] Updated message: ${messageId}`);
            return res.status(200).json({ success: true, messageId });
        }

        // DELETE - Delete message(s)
        if (req.method === 'DELETE') {
            const messageId = req.query.messageId as string || req.body?.messageId;
            const sessionId = req.query.sessionId as string || req.body?.sessionId;
            const fromMessageId = req.query.fromMessageId as string || req.body?.fromMessageId;

            // Delete all messages from a specific message onwards (for edit/truncate)
            if (sessionId && fromMessageId) {
                const targetMessage = await collection.findOne({ messageId: fromMessageId });
                if (targetMessage) {
                    await collection.deleteMany({
                        sessionId,
                        timestamp: { $gte: targetMessage.timestamp }
                    });
                    console.log(`[DB] Deleted messages from ${fromMessageId} onwards in session: ${sessionId}`);
                    return res.status(200).json({ success: true });
                }
            }

            // Delete single message
            if (messageId) {
                await collection.deleteOne({ messageId });
                console.log(`[DB] Deleted message: ${messageId}`);
                return res.status(200).json({ success: true, messageId });
            }

            // Delete all messages for a session
            if (sessionId) {
                const result = await collection.deleteMany({ sessionId });
                console.log(`[DB] Deleted ${result.deletedCount} messages for session: ${sessionId}`);
                return res.status(200).json({ success: true, deletedCount: result.deletedCount });
            }

            return res.status(400).json({ error: 'messageId or sessionId is required' });
        }

        return res.status(405).json({ error: 'Method not allowed' });

    } catch (error) {
        console.error('[DB Messages] Error:', error);
        return res.status(500).json({
            error: error instanceof Error ? error.message : 'Internal server error'
        });
    }
}
