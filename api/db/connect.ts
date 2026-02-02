import { MongoClient, Db } from 'mongodb';

// MongoDB connection singleton
let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB = process.env.MONGODB_DB || 'mira';

if (!MONGODB_URI) {
    console.warn('MONGODB_URI environment variable is not set');
}

export interface MongoConnection {
    client: MongoClient;
    db: Db;
}

/**
 * Connect to MongoDB Atlas
 * Uses connection pooling for serverless functions
 */
export async function connectToDatabase(): Promise<MongoConnection | null> {
    // Return cached connection if exists
    if (cachedClient && cachedDb) {
        try {
            // Ping to verify connection is still alive
            await cachedDb.admin().ping();
            return { client: cachedClient, db: cachedDb };
        } catch {
            console.warn('⚠️ Cached MongoDB connection is stale, reconnecting...');
            // Clear stale cache
            cachedClient = null;
            cachedDb = null;
        }
    }

    if (!MONGODB_URI) {
        console.warn('⚠️ MONGODB_URI not configured, skipping database connection');
        return null;
    }

    try {
        // Create new connection with proper timeout settings
        const client = new MongoClient(MONGODB_URI, {
            maxPoolSize: 10,
            minPoolSize: 1,
            serverSelectionTimeoutMS: 3000, // Reduced to 3s for Vercel fast fail
            socketTimeoutMS: 30000,
            connectTimeoutMS: 5000,
            retryWrites: true,
            retryReads: true,
        });

        await client.connect();
        const db = client.db(MONGODB_DB);

        // Cache the connection
        cachedClient = client;
        cachedDb = db;

        console.log('📦 Connected to MongoDB Atlas');
        return { client, db };
    } catch (error) {
        console.error('❌ MongoDB connection failed:', error);
        // Clear any partial cache
        cachedClient = null;
        cachedDb = null;
        // Return null instead of throwing - allows chat to work without DB
        return null;
    }
}

/**
 * Get database instance (for when you only need db, not client)
 */
export async function getDatabase(): Promise<Db | null> {
    const connection = await connectToDatabase();
    return connection?.db ?? null;
}
