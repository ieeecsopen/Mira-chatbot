/**
 * Retry Utility with Exponential Backoff
 * Provides smart retry logic for API calls and other async operations
 */

export interface RetryConfig {
    /** Maximum number of retry attempts (default: 3) */
    maxAttempts?: number;
    /** Initial delay in milliseconds (default: 1000) */
    initialDelayMs?: number;
    /** Maximum delay in milliseconds (default: 30000) */
    maxDelayMs?: number;
    /** Backoff multiplier (default: 2) */
    backoffMultiplier?: number;
    /** Add randomness to delays to prevent thundering herd (default: true) */
    jitter?: boolean;
    /** Errors that should NOT trigger a retry */
    nonRetryableErrors?: string[];
    /** Callback for each retry attempt */
    onRetry?: (attempt: number, error: Error, nextDelayMs: number) => void;
    /** Callback when all retries exhausted */
    onExhausted?: (error: Error, totalAttempts: number) => void;
}

export interface RetryResult<T> {
    success: boolean;
    data?: T;
    error?: Error;
    attempts: number;
    totalTimeMs: number;
}

const DEFAULT_CONFIG: Required<Omit<RetryConfig, 'onRetry' | 'onExhausted'>> = {
    maxAttempts: 3,
    initialDelayMs: 1000,
    maxDelayMs: 30000,
    backoffMultiplier: 2,
    jitter: true,
    nonRetryableErrors: [
        'Invalid API key',
        'API key not valid',
        'unauthorized',
        'forbidden',
        '401',
        '403',
        'INVALID_ARGUMENT',
        'not found',
        '404',
    ],
};

/**
 * Check if an error is retryable
 */
function isRetryableError(error: Error, nonRetryableErrors: string[]): boolean {
    const errorMessage = error.message?.toLowerCase() || '';
    const errorName = error.name?.toLowerCase() || '';

    // Check against non-retryable patterns
    for (const pattern of nonRetryableErrors) {
        if (errorMessage.includes(pattern.toLowerCase()) ||
            errorName.includes(pattern.toLowerCase())) {
            return false;
        }
    }

    // These are typically retryable
    const retryablePatterns = [
        'timeout',
        'network',
        'econnreset',
        'econnrefused',
        'socket',
        'rate',
        'limit',
        '429',
        '500',
        '502',
        '503',
        '504',
        'overloaded',
        'busy',
        'temporarily',
        'try again',
        'quota',
    ];

    return retryablePatterns.some(
        pattern => errorMessage.includes(pattern) || errorName.includes(pattern)
    );
}

/**
 * Calculate delay with exponential backoff and optional jitter
 */
function calculateDelay(
    attempt: number,
    initialDelayMs: number,
    maxDelayMs: number,
    backoffMultiplier: number,
    jitter: boolean
): number {
    // Exponential backoff: initialDelay * (multiplier ^ attempt)
    let delay = initialDelayMs * Math.pow(backoffMultiplier, attempt - 1);

    // Cap at maximum delay
    delay = Math.min(delay, maxDelayMs);

    // Add jitter (±25% randomness) to prevent thundering herd
    if (jitter) {
        const jitterRange = delay * 0.25;
        delay = delay - jitterRange + (Math.random() * jitterRange * 2);
    }

    return Math.floor(delay);
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Execute an async operation with automatic retry and exponential backoff
 * 
 * @example
 * ```ts
 * const result = await withRetry(
 *   () => fetch('https://api.example.com/data'),
 *   {
 *     maxAttempts: 5,
 *     initialDelayMs: 500,
 *     onRetry: (attempt, error, delay) => {
 *       console.log(`Retry ${attempt}: ${error.message}, waiting ${delay}ms`);
 *     }
 *   }
 * );
 * ```
 */
export async function withRetry<T>(
    operation: () => Promise<T>,
    config: RetryConfig = {}
): Promise<RetryResult<T>> {
    const cfg = {
        ...DEFAULT_CONFIG,
        ...config,
        nonRetryableErrors: config.nonRetryableErrors || DEFAULT_CONFIG.nonRetryableErrors,
    };

    const startTime = Date.now();
    let lastError: Error = new Error('Unknown error');

    for (let attempt = 1; attempt <= cfg.maxAttempts; attempt++) {
        try {
            const data = await operation();
            return {
                success: true,
                data,
                attempts: attempt,
                totalTimeMs: Date.now() - startTime,
            };
        } catch (error) {
            lastError = error as Error;

            console.warn(`🔄 Attempt ${attempt}/${cfg.maxAttempts} failed:`, lastError.message);

            // Check if we should retry
            const shouldRetry =
                attempt < cfg.maxAttempts &&
                isRetryableError(lastError, cfg.nonRetryableErrors);

            if (!shouldRetry) {
                if (!isRetryableError(lastError, cfg.nonRetryableErrors)) {
                    console.error('❌ Non-retryable error:', lastError.message);
                }
                break;
            }

            // Calculate delay for next attempt
            const delay = calculateDelay(
                attempt,
                cfg.initialDelayMs,
                cfg.maxDelayMs,
                cfg.backoffMultiplier,
                cfg.jitter
            );

            // Notify about retry
            config.onRetry?.(attempt, lastError, delay);
            console.log(`⏳ Waiting ${delay}ms before retry ${attempt + 1}...`);

            await sleep(delay);
        }
    }

    // All retries exhausted
    config.onExhausted?.(lastError, cfg.maxAttempts);
    console.error(`💥 All ${cfg.maxAttempts} attempts failed`);

    return {
        success: false,
        error: lastError,
        attempts: cfg.maxAttempts,
        totalTimeMs: Date.now() - startTime,
    };
}

/**
 * A simpler retry wrapper that throws on failure
 */
export async function retryAsync<T>(
    operation: () => Promise<T>,
    config: RetryConfig = {}
): Promise<T> {
    const result = await withRetry(operation, config);

    if (!result.success) {
        throw result.error || new Error('Operation failed after retries');
    }

    return result.data!;
}

/**
 * Retry manager for tracking and limiting retries across operations
 */
class RetryManager {
    private activeRetries: Map<string, { count: number; lastAttempt: number }> = new Map();
    private readonly maxConcurrentRetries = 5;
    private readonly cooldownMs = 60000; // 1 minute cooldown after max retries

    /**
     * Check if operation should be allowed to retry
     */
    canRetry(operationId: string): boolean {
        const entry = this.activeRetries.get(operationId);

        if (!entry) return true;

        // Check if we're in cooldown period
        if (entry.count >= this.maxConcurrentRetries) {
            if (Date.now() - entry.lastAttempt < this.cooldownMs) {
                return false;
            }
            // Reset after cooldown
            this.activeRetries.delete(operationId);
            return true;
        }

        return true;
    }

    /**
     * Record a retry attempt
     */
    recordRetry(operationId: string): void {
        const entry = this.activeRetries.get(operationId);

        if (entry) {
            entry.count++;
            entry.lastAttempt = Date.now();
        } else {
            this.activeRetries.set(operationId, {
                count: 1,
                lastAttempt: Date.now(),
            });
        }
    }

    /**
     * Clear retry tracking for an operation (on success)
     */
    clearRetry(operationId: string): void {
        this.activeRetries.delete(operationId);
    }

    /**
     * Get current retry statistics
     */
    getStats(): { operationId: string; count: number; lastAttempt: Date }[] {
        return Array.from(this.activeRetries.entries()).map(([id, entry]) => ({
            operationId: id,
            count: entry.count,
            lastAttempt: new Date(entry.lastAttempt),
        }));
    }
}

// Singleton instance
export const retryManager = new RetryManager();

/**
 * Decorator-style retry wrapper with operation tracking
 */
export async function withManagedRetry<T>(
    operationId: string,
    operation: () => Promise<T>,
    config: RetryConfig = {}
): Promise<RetryResult<T>> {
    if (!retryManager.canRetry(operationId)) {
        return {
            success: false,
            error: new Error('Operation in cooldown after too many retries'),
            attempts: 0,
            totalTimeMs: 0,
        };
    }

    const result = await withRetry(operation, {
        ...config,
        onRetry: (attempt, error, delay) => {
            retryManager.recordRetry(operationId);
            config.onRetry?.(attempt, error, delay);
        },
    });

    if (result.success) {
        retryManager.clearRetry(operationId);
    }

    return result;
}

export default { withRetry, retryAsync, withManagedRetry, retryManager };
