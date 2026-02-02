import type { VercelRequest, VercelResponse } from '@vercel/node';
import { connectToDatabase } from './db/connect';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    try {
        console.log('Test DB: Starting connection attempt...');
        const start = Date.now();

        // Force new connection for testing
        const connection = await connectToDatabase();

        const duration = Date.now() - start;

        if (connection) {
            await connection.db.admin().ping();
            res.status(200).json({
                status: 'ok',
                message: 'MongoDB connection successful',
                duration: `${duration}ms`,
                databaseName: connection.db.databaseName
            });
        } else {
            res.status(500).json({
                status: 'error',
                message: 'MongoDB connection returned null (check logs)',
                duration: `${duration}ms`
            });
        }
    } catch (error) {
        console.error('Test DB Error:', error);
        res.status(500).json({
            status: 'error',
            message: error instanceof Error ? error.message : 'Unknown error',
            stack: process.env.NODE_ENV === 'development' ? (error as Error).stack : undefined
        });
    }
}
