import 'dotenv/config';
import { connectToDatabase } from './api/db/connect.js';
import { ObjectId } from 'mongodb';

interface TestSession {
    _id?: ObjectId;
    sessionId: string;
    title: string;
    model: string;
    createdAt: Date;
    updatedAt: Date;
}

interface TestMessage {
    _id?: ObjectId;
    messageId: string;
    sessionId: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

async function testDatabase() {
    console.log('🧪 Starting database tests...\n');

    try {
        // Test 1: Connection
        console.log('Test 1: Testing database connection...');
        const connection = await connectToDatabase();
        if (!connection) {
            throw new Error('Failed to connect to MongoDB - MONGODB_URI may not be configured');
        }
        const { client, db } = connection;
        console.log('✅ Successfully connected to MongoDB');
        console.log(`   Database: ${db.databaseName}\n`);

        // Test 2: List collections
        console.log('Test 2: Listing collections...');
        const collections = await db.listCollections().toArray();
        console.log(`✅ Found ${collections.length} collections:`);
        collections.forEach((col: { name: string }) => console.log(`   - ${col.name}`));
        console.log();

        // Test 3: Create test session
        console.log('Test 3: Creating test session...');
        const sessionsCollection = db.collection<TestSession>('sessions');
        const testSessionId = `test-session-${Date.now()}`;
        const testSession: TestSession = {
            sessionId: testSessionId,
            title: 'Database Test Session',
            model: 'gpt-4',
            createdAt: new Date(),
            updatedAt: new Date()
        };

        const sessionResult = await sessionsCollection.insertOne(testSession);
        console.log(`✅ Created test session with ID: ${sessionResult.insertedId}`);
        console.log(`   Session ID: ${testSessionId}\n`);

        // Test 4: Create test messages
        console.log('Test 4: Creating test messages...');
        const messagesCollection = db.collection<TestMessage>('messages');

        const testMessages: TestMessage[] = [
            {
                messageId: `msg-${Date.now()}-1`,
                sessionId: testSessionId,
                role: 'user',
                content: 'Hello, this is a test message!',
                timestamp: new Date()
            },
            {
                messageId: `msg-${Date.now()}-2`,
                sessionId: testSessionId,
                role: 'assistant',
                content: 'This is a test response from the assistant.',
                timestamp: new Date()
            }
        ];

        const messagesResult = await messagesCollection.insertMany(testMessages);
        console.log(`✅ Created ${messagesResult.insertedCount} test messages\n`);

        // Test 5: Read test session
        console.log('Test 5: Reading test session...');
        const retrievedSession = await sessionsCollection.findOne({ sessionId: testSessionId });
        if (retrievedSession) {
            console.log('✅ Successfully retrieved session:');
            console.log(`   Title: ${retrievedSession.title}`);
            console.log(`   Model: ${retrievedSession.model}\n`);
        } else {
            console.log('❌ Failed to retrieve session\n');
        }

        // Test 6: Read test messages
        console.log('Test 6: Reading test messages...');
        const retrievedMessages = await messagesCollection
            .find({ sessionId: testSessionId })
            .sort({ timestamp: 1 })
            .toArray();

        console.log(`✅ Retrieved ${retrievedMessages.length} messages:`);
        retrievedMessages.forEach((msg: TestMessage, idx: number) => {
            console.log(`   ${idx + 1}. [${msg.role}] ${msg.content.substring(0, 50)}...`);
        });
        console.log();

        // Test 7: Update test session
        console.log('Test 7: Updating test session...');
        const updateResult = await sessionsCollection.updateOne(
            { sessionId: testSessionId },
            {
                $set: {
                    title: 'Updated Test Session',
                    updatedAt: new Date()
                }
            }
        );
        console.log(`✅ Updated ${updateResult.modifiedCount} session(s)\n`);

        // Test 8: Count documents
        console.log('Test 8: Counting documents...');
        const sessionCount = await sessionsCollection.countDocuments();
        const messageCount = await messagesCollection.countDocuments();
        console.log(`✅ Total sessions: ${sessionCount}`);
        console.log(`✅ Total messages: ${messageCount}\n`);

        // Test 9: Cleanup - Delete test data
        console.log('Test 9: Cleaning up test data...');
        const deleteMessagesResult = await messagesCollection.deleteMany({ sessionId: testSessionId });
        const deleteSessionResult = await sessionsCollection.deleteOne({ sessionId: testSessionId });
        console.log(`✅ Deleted ${deleteMessagesResult.deletedCount} test message(s)`);
        console.log(`✅ Deleted ${deleteSessionResult.deletedCount} test session(s)\n`);

        // Test 10: Close connection
        console.log('Test 10: Closing connection...');
        await client.close();
        console.log('✅ Connection closed\n');

        console.log('🎉 All database tests passed successfully!');

    } catch (error) {
        console.error('❌ Database test failed:', error);
        if (error instanceof Error) {
            console.error('Error message:', error.message);
            console.error('Error stack:', error.stack);
        }
        process.exit(1);
    }
}

// Run tests
testDatabase();
