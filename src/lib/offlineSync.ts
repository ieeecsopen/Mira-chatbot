/**
 * Offline Sync Module for MIRA
 * Handles message queuing when offline and syncing when back online
 * Uses IndexedDB for persistent storage and Background Sync API
 */

// IndexedDB configuration
const DB_NAME = 'mira-offline-db';
const DB_VERSION = 1;
const QUEUE_STORE = 'message-queue';
const PREFETCH_STORE = 'prefetch-cache';

export interface QueuedMessage {
    id: string;
    sessionId: string;
    message: string;
    timestamp: number;
    retries: number;
    status: 'pending' | 'syncing' | 'failed';
    conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
    options?: {
        enableWebSearch?: boolean;
        selectedModel?: string;
    };
}

export interface SyncStatus {
    isOnline: boolean;
    pendingCount: number;
    syncing: boolean;
    lastSyncTime: number | null;
    failedCount: number;
}

let db: IDBDatabase | null = null;
let syncInProgress = false;
let lastSyncTime: number | null = null;

/**
 * Initialize IndexedDB
 */
export async function initOfflineDB(): Promise<IDBDatabase> {
    if (db) return db;

    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => {
            console.error('❌ Failed to open IndexedDB:', request.error);
            reject(request.error);
        };

        request.onsuccess = () => {
            db = request.result;
            console.log('✅ IndexedDB initialized');
            resolve(db);
        };

        request.onupgradeneeded = (event) => {
            const database = (event.target as IDBOpenDBRequest).result;

            // Message queue store
            if (!database.objectStoreNames.contains(QUEUE_STORE)) {
                const queueStore = database.createObjectStore(QUEUE_STORE, { keyPath: 'id' });
                queueStore.createIndex('status', 'status', { unique: false });
                queueStore.createIndex('timestamp', 'timestamp', { unique: false });
                console.log('📦 Created message queue store');
            }

            // Prefetch cache store
            if (!database.objectStoreNames.contains(PREFETCH_STORE)) {
                const prefetchStore = database.createObjectStore(PREFETCH_STORE, { keyPath: 'query' });
                prefetchStore.createIndex('timestamp', 'timestamp', { unique: false });
                console.log('📦 Created prefetch cache store');
            }
        };
    });
}

/**
 * Generate unique ID for queued messages
 */
function generateQueueId(): string {
    return `queue_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Add message to offline queue
 */
export async function queueMessage(
    message: string,
    sessionId: string,
    conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>,
    options?: { enableWebSearch?: boolean; selectedModel?: string }
): Promise<QueuedMessage> {
    const database = await initOfflineDB();

    const queuedMessage: QueuedMessage = {
        id: generateQueueId(),
        sessionId,
        message,
        timestamp: Date.now(),
        retries: 0,
        status: 'pending',
        conversationHistory,
        options,
    };

    return new Promise((resolve, reject) => {
        const transaction = database.transaction([QUEUE_STORE], 'readwrite');
        const store = transaction.objectStore(QUEUE_STORE);
        const request = store.add(queuedMessage);

        request.onsuccess = () => {
            console.log(`📤 Message queued for offline sync: ${queuedMessage.id}`);

            // Register for background sync if available
            registerBackgroundSync();

            resolve(queuedMessage);
        };

        request.onerror = () => {
            console.error('❌ Failed to queue message:', request.error);
            reject(request.error);
        };
    });
}

/**
 * Get all pending messages from queue
 */
export async function getPendingMessages(): Promise<QueuedMessage[]> {
    const database = await initOfflineDB();

    return new Promise((resolve, reject) => {
        const transaction = database.transaction([QUEUE_STORE], 'readonly');
        const store = transaction.objectStore(QUEUE_STORE);
        const index = store.index('status');
        const request = index.getAll('pending');

        request.onsuccess = () => {
            resolve(request.result || []);
        };

        request.onerror = () => {
            reject(request.error);
        };
    });
}

/**
 * Update message status in queue
 */
export async function updateMessageStatus(
    id: string,
    status: QueuedMessage['status'],
    retries?: number
): Promise<void> {
    const database = await initOfflineDB();

    return new Promise((resolve, reject) => {
        const transaction = database.transaction([QUEUE_STORE], 'readwrite');
        const store = transaction.objectStore(QUEUE_STORE);
        const getRequest = store.get(id);

        getRequest.onsuccess = () => {
            const message = getRequest.result;
            if (message) {
                message.status = status;
                if (retries !== undefined) {
                    message.retries = retries;
                }
                const putRequest = store.put(message);
                putRequest.onsuccess = () => resolve();
                putRequest.onerror = () => reject(putRequest.error);
            } else {
                resolve();
            }
        };

        getRequest.onerror = () => reject(getRequest.error);
    });
}

/**
 * Remove message from queue (after successful sync)
 */
export async function removeFromQueue(id: string): Promise<void> {
    const database = await initOfflineDB();

    return new Promise((resolve, reject) => {
        const transaction = database.transaction([QUEUE_STORE], 'readwrite');
        const store = transaction.objectStore(QUEUE_STORE);
        const request = store.delete(id);

        request.onsuccess = () => {
            console.log(`✅ Message removed from queue: ${id}`);
            resolve();
        };

        request.onerror = () => reject(request.error);
    });
}

/**
 * Get queue count by status
 */
export async function getQueueCounts(): Promise<{ pending: number; failed: number; syncing: number }> {
    const database = await initOfflineDB();

    return new Promise((resolve, reject) => {
        const transaction = database.transaction([QUEUE_STORE], 'readonly');
        const store = transaction.objectStore(QUEUE_STORE);
        const request = store.getAll();

        request.onsuccess = () => {
            const messages = request.result || [];
            resolve({
                pending: messages.filter(m => m.status === 'pending').length,
                failed: messages.filter(m => m.status === 'failed').length,
                syncing: messages.filter(m => m.status === 'syncing').length,
            });
        };

        request.onerror = () => reject(request.error);
    });
}

/**
 * Register for Background Sync
 */
export async function registerBackgroundSync(): Promise<void> {
    if ('serviceWorker' in navigator && 'sync' in ServiceWorkerRegistration.prototype) {
        try {
            const registration = await navigator.serviceWorker.ready;
            // @ts-expect-error - sync is not in the type definitions
            await registration.sync.register('sync-messages');
            console.log('📡 Background sync registered');
        } catch (error) {
            console.warn('⚠️ Background sync registration failed:', error);
        }
    }
}

/**
 * Process queued messages (called when back online or by background sync)
 */
export async function processQueue(
    sendFunction: (
        message: string,
        sessionId: string,
        history?: Array<{ role: 'user' | 'assistant'; content: string }>,
        options?: { enableWebSearch?: boolean; selectedModel?: string }
    ) => Promise<string>
): Promise<{ success: number; failed: number }> {
    if (syncInProgress) {
        console.log('⏳ Sync already in progress');
        return { success: 0, failed: 0 };
    }

    if (!navigator.onLine) {
        console.log('📴 Still offline, skipping sync');
        return { success: 0, failed: 0 };
    }

    syncInProgress = true;
    console.log('🔄 Processing offline message queue...');

    const pendingMessages = await getPendingMessages();
    let success = 0;
    let failed = 0;

    for (const queuedMessage of pendingMessages) {
        try {
            await updateMessageStatus(queuedMessage.id, 'syncing');

            // Send the message
            await sendFunction(
                queuedMessage.message,
                queuedMessage.sessionId,
                queuedMessage.conversationHistory,
                queuedMessage.options
            );

            // Remove from queue on success
            await removeFromQueue(queuedMessage.id);
            success++;
            console.log(`✅ Synced message: ${queuedMessage.id}`);
        } catch (error) {
            console.error(`❌ Failed to sync message: ${queuedMessage.id}`, error);

            const newRetries = queuedMessage.retries + 1;
            if (newRetries >= 3) {
                await updateMessageStatus(queuedMessage.id, 'failed', newRetries);
                failed++;
            } else {
                await updateMessageStatus(queuedMessage.id, 'pending', newRetries);
            }
        }
    }

    syncInProgress = false;
    lastSyncTime = Date.now();

    console.log(`📊 Sync complete: ${success} success, ${failed} failed`);
    return { success, failed };
}

/**
 * Get current sync status
 */
export async function getSyncStatus(): Promise<SyncStatus> {
    const counts = await getQueueCounts();

    return {
        isOnline: navigator.onLine,
        pendingCount: counts.pending,
        syncing: syncInProgress,
        lastSyncTime,
        failedCount: counts.failed,
    };
}

/**
 * Clear failed messages from queue
 */
export async function clearFailedMessages(): Promise<number> {
    const database = await initOfflineDB();

    return new Promise((resolve, reject) => {
        const transaction = database.transaction([QUEUE_STORE], 'readwrite');
        const store = transaction.objectStore(QUEUE_STORE);
        const index = store.index('status');
        const request = index.openCursor(IDBKeyRange.only('failed'));

        let count = 0;

        request.onsuccess = (event) => {
            const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
            if (cursor) {
                cursor.delete();
                count++;
                cursor.continue();
            } else {
                console.log(`🗑️ Cleared ${count} failed messages`);
                resolve(count);
            }
        };

        request.onerror = () => reject(request.error);
    });
}

/**
 * Retry failed messages
 */
export async function retryFailedMessages(): Promise<number> {
    const database = await initOfflineDB();

    return new Promise((resolve, reject) => {
        const transaction = database.transaction([QUEUE_STORE], 'readwrite');
        const store = transaction.objectStore(QUEUE_STORE);
        const index = store.index('status');
        const request = index.openCursor(IDBKeyRange.only('failed'));

        let count = 0;

        request.onsuccess = (event) => {
            const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
            if (cursor) {
                const message = cursor.value;
                message.status = 'pending';
                message.retries = 0;
                cursor.update(message);
                count++;
                cursor.continue();
            } else {
                console.log(`🔄 Reset ${count} failed messages for retry`);
                resolve(count);
            }
        };

        request.onerror = () => reject(request.error);
    });
}

// ==================== PREFETCH CACHE ====================

export interface PrefetchedResponse {
    query: string;
    response: string;
    timestamp: number;
    model?: string;
}

/**
 * Store prefetched response
 */
export async function storePrefetchedResponse(
    query: string,
    response: string,
    model?: string
): Promise<void> {
    const database = await initOfflineDB();

    const prefetched: PrefetchedResponse = {
        query: query.toLowerCase().trim(),
        response,
        timestamp: Date.now(),
        model,
    };

    return new Promise((resolve, reject) => {
        const transaction = database.transaction([PREFETCH_STORE], 'readwrite');
        const store = transaction.objectStore(PREFETCH_STORE);
        const request = store.put(prefetched);

        request.onsuccess = () => {
            console.log(`💾 Prefetched response stored for: "${query.substring(0, 30)}..."`);
            resolve();
        };

        request.onerror = () => reject(request.error);
    });
}

/**
 * Get prefetched response
 */
export async function getPrefetchedResponse(query: string): Promise<PrefetchedResponse | null> {
    const database = await initOfflineDB();
    const normalizedQuery = query.toLowerCase().trim();

    return new Promise((resolve, reject) => {
        const transaction = database.transaction([PREFETCH_STORE], 'readonly');
        const store = transaction.objectStore(PREFETCH_STORE);
        const request = store.get(normalizedQuery);

        request.onsuccess = () => {
            const result = request.result;

            // Check if prefetched response is still valid (max 1 hour)
            if (result && Date.now() - result.timestamp < 60 * 60 * 1000) {
                console.log(`🚀 Prefetched response found for: "${query.substring(0, 30)}..."`);
                resolve(result);
            } else {
                resolve(null);
            }
        };

        request.onerror = () => reject(request.error);
    });
}

/**
 * Clean up old prefetched responses
 */
export async function cleanupPrefetchCache(maxAge: number = 60 * 60 * 1000): Promise<number> {
    const database = await initOfflineDB();
    const cutoffTime = Date.now() - maxAge;

    return new Promise((resolve, reject) => {
        const transaction = database.transaction([PREFETCH_STORE], 'readwrite');
        const store = transaction.objectStore(PREFETCH_STORE);
        const index = store.index('timestamp');
        const request = index.openCursor(IDBKeyRange.upperBound(cutoffTime));

        let count = 0;

        request.onsuccess = (event) => {
            const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
            if (cursor) {
                cursor.delete();
                count++;
                cursor.continue();
            } else {
                if (count > 0) {
                    console.log(`🧹 Cleaned up ${count} old prefetched responses`);
                }
                resolve(count);
            }
        };

        request.onerror = () => reject(request.error);
    });
}

// Initialize on module load
initOfflineDB().catch(console.error);

// Listen for online/offline events
if (typeof window !== 'undefined') {
    window.addEventListener('online', () => {
        console.log('🌐 Back online - will sync queued messages');
        // Note: actual sync should be triggered by the app with the send function
    });

    window.addEventListener('offline', () => {
        console.log('📴 Going offline - messages will be queued');
    });
}
