/**
 * Resilient Logger Utility
 * 
 * Provides:
 * - Error rate limiting (same error logged once per window)
 * - Exponential backoff for transient failures
 * - Circuit breaker for system-level failures
 * - Disk space monitoring before file writes
 * - Separate infrastructure vs application error handling
 * 
 * @module utils/resilientLogger
 */

import fs from "fs";
import path from "path";
import os from "os";

// ============================================================================
// ERROR FINGERPRINTING & DEDUPLICATION
// ============================================================================

/**
 * In-memory cache for error deduplication
 * Key: error fingerprint (hash of message + stack)
 * Value: { count: number, firstSeen: Date, lastSeen: Date }
 */
const errorCache = new Map();
const ERROR_WINDOW_MS = 60000; // 1 minute window for deduplication
const MAX_CACHE_SIZE = 1000;

/**
 * Generate a fingerprint for an error to identify duplicates
 * @param {Error|string} error - The error to fingerprint
 * @returns {string} - A unique fingerprint for this error type
 */
function generateErrorFingerprint(error) {
    const message = typeof error === "string" ? error : error.message || "unknown";
    const stack = typeof error === "object" && error.stack
        ? error.stack.split("\n").slice(0, 3).join("|") // First 3 stack frames
        : "";

    // Simple hash function
    const str = `${message}|${stack}`;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(16);
}

/**
 * Check if an error should be logged (rate limiting)
 * @param {Error|string} error - The error to check
 * @returns {{ shouldLog: boolean, count: number }} - Whether to log and occurrence count
 */
export function shouldLogError(error) {
    const fingerprint = generateErrorFingerprint(error);
    const now = Date.now();

    // Clean up old entries if cache is too large
    if (errorCache.size > MAX_CACHE_SIZE) {
        const cutoff = now - ERROR_WINDOW_MS;
        for (const [key, value] of errorCache.entries()) {
            if (value.lastSeen < cutoff) {
                errorCache.delete(key);
            }
        }
    }

    const existing = errorCache.get(fingerprint);

    if (existing) {
        const timeSinceFirst = now - existing.firstSeen;

        // Within the same window, increment count but don't log
        if (timeSinceFirst < ERROR_WINDOW_MS) {
            existing.count++;
            existing.lastSeen = now;

            // Log summary every 100 occurrences
            if (existing.count % 100 === 0) {
                return { shouldLog: true, count: existing.count, isSummary: true };
            }

            return { shouldLog: false, count: existing.count };
        } else {
            // Window expired, log summary of previous window and reset
            const summary = {
                shouldLog: true,
                count: existing.count,
                isSummary: true,
                windowExpired: true
            };

            // Reset for new window
            errorCache.set(fingerprint, {
                count: 1,
                firstSeen: now,
                lastSeen: now
            });

            return summary;
        }
    }

    // First time seeing this error
    errorCache.set(fingerprint, {
        count: 1,
        firstSeen: now,
        lastSeen: now
    });

    return { shouldLog: true, count: 1 };
}

// ============================================================================
// CIRCUIT BREAKER
// ============================================================================

/**
 * Circuit breaker states
 */
const CircuitState = {
    CLOSED: "CLOSED",     // Normal operation
    OPEN: "OPEN",         // Failing, reject all
    HALF_OPEN: "HALF_OPEN" // Testing if recovered
};

/**
 * Circuit breaker for protecting downstream systems
 */
class CircuitBreaker {
    constructor(options = {}) {
        this.failureThreshold = options.failureThreshold || 5;
        this.resetTimeout = options.resetTimeout || 30000; // 30 seconds
        this.halfOpenRequests = options.halfOpenRequests || 3;

        this.state = CircuitState.CLOSED;
        this.failureCount = 0;
        this.lastFailureTime = null;
        this.halfOpenSuccesses = 0;
    }

    /**
     * Check if request should be allowed
     * @returns {boolean}
     */
    canExecute() {
        if (this.state === CircuitState.CLOSED) {
            return true;
        }

        if (this.state === CircuitState.OPEN) {
            // Check if it's time to try again
            if (Date.now() - this.lastFailureTime >= this.resetTimeout) {
                this.state = CircuitState.HALF_OPEN;
                this.halfOpenSuccesses = 0;
                return true;
            }
            return false;
        }

        if (this.state === CircuitState.HALF_OPEN) {
            return true;
        }

        return false;
    }

    /**
     * Record a successful operation
     */
    recordSuccess() {
        if (this.state === CircuitState.HALF_OPEN) {
            this.halfOpenSuccesses++;
            if (this.halfOpenSuccesses >= this.halfOpenRequests) {
                this.state = CircuitState.CLOSED;
                this.failureCount = 0;
            }
        } else if (this.state === CircuitState.CLOSED) {
            this.failureCount = 0;
        }
    }

    /**
     * Record a failed operation
     */
    recordFailure() {
        this.failureCount++;
        this.lastFailureTime = Date.now();

        if (this.state === CircuitState.HALF_OPEN) {
            this.state = CircuitState.OPEN;
        } else if (this.failureCount >= this.failureThreshold) {
            this.state = CircuitState.OPEN;
        }
    }

    /**
     * Get current state
     */
    getState() {
        return {
            state: this.state,
            failureCount: this.failureCount,
            lastFailureTime: this.lastFailureTime
        };
    }
}

// Create circuit breakers for different concerns
export const fileLoggerCircuitBreaker = new CircuitBreaker({
    failureThreshold: 3,
    resetTimeout: 60000 // 1 minute
});

export const mongoLoggerCircuitBreaker = new CircuitBreaker({
    failureThreshold: 5,
    resetTimeout: 120000 // 2 minutes
});

// ============================================================================
// DISK SPACE MONITORING
// ============================================================================

/**
 * Check if disk has sufficient space for logging
 * @param {string} logPath - Path to the log directory
 * @param {number} minSpaceMB - Minimum required space in MB (default: 100MB)
 * @returns {Promise<boolean>} - True if sufficient space available
 */
export async function hasSufficientDiskSpace(logPath, minSpaceMB = 100) {
    try {
        // For Windows, check the drive
        if (process.platform === "win32") {
            const drive = path.parse(logPath).root;
            // Use a simple file write test as a proxy
            const testFile = path.join(logPath, `.disk_check_${Date.now()}`);
            try {
                fs.writeFileSync(testFile, "test");
                fs.unlinkSync(testFile);
                return true;
            } catch (e) {
                if (e.code === "ENOSPC" || e.code === "EIO") {
                    return false;
                }
                // Other errors might not be disk-related
                return true;
            }
        }

        // For Unix-like systems
        const stats = fs.statfsSync ? fs.statfsSync(logPath) : null;
        if (stats) {
            const availableMB = (stats.bavail * stats.bsize) / (1024 * 1024);
            return availableMB >= minSpaceMB;
        }

        return true; // Assume OK if we can't check
    } catch (error) {
        console.warn("Could not check disk space:", error.message);
        return true; // Assume OK if check fails
    }
}

// ============================================================================
// EXPONENTIAL BACKOFF
// ============================================================================

/**
 * Calculate delay with exponential backoff and jitter
 * @param {number} attempt - Current attempt number (0-indexed)
 * @param {number} baseDelay - Base delay in ms (default: 1000)
 * @param {number} maxDelay - Maximum delay in ms (default: 30000)
 * @returns {number} - Delay in milliseconds
 */
export function calculateBackoff(attempt, baseDelay = 1000, maxDelay = 30000) {
    const exponentialDelay = baseDelay * Math.pow(2, attempt);
    const jitter = Math.random() * baseDelay; // Add jitter to prevent thundering herd
    return Math.min(exponentialDelay + jitter, maxDelay);
}

/**
 * Sleep for a specified duration
 * @param {number} ms - Duration in milliseconds
 * @returns {Promise<void>}
 */
export function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Execute a function with retry and exponential backoff
 * @param {Function} fn - Function to execute
 * @param {Object} options - Retry options
 * @returns {Promise<any>}
 */
export async function withRetry(fn, options = {}) {
    const {
        maxAttempts = 3,
        baseDelay = 1000,
        maxDelay = 30000,
        onRetry = null,
        shouldRetry = () => true
    } = options;

    let lastError;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;

            // Check if we should retry
            if (!shouldRetry(error) || attempt === maxAttempts - 1) {
                throw error;
            }

            const delay = calculateBackoff(attempt, baseDelay, maxDelay);

            if (onRetry) {
                onRetry({ error, attempt, delay });
            }

            await sleep(delay);
        }
    }

    throw lastError;
}

// ============================================================================
// INFRASTRUCTURE ERROR DETECTION
// ============================================================================

/**
 * List of error codes/messages that indicate infrastructure failure
 * These should NOT be logged to MongoDB (would cause infinite loop)
 */
const INFRA_ERROR_PATTERNS = [
    "EIO",           // I/O error
    "ENOSPC",        // No space left on device
    "EDQUOT",        // Disk quota exceeded
    "EROFS",         // Read-only file system
    "EMFILE",        // Too many open files
    "ENFILE",        // File table overflow
    "ECONNREFUSED",  // Connection refused (DB down)
    "ENOTCONN",      // Transport endpoint not connected
    "ETIMEDOUT",     // Connection timed out
    "ENETUNREACH",   // Network unreachable
    "EHOSTUNREACH",  // No route to host
    "MongoNetworkError",
    "MongoTimeoutError",
    "MongoServerSelectionError"
];

/**
 * Check if an error is an infrastructure-level failure
 * @param {Error|string} error - The error to check
 * @returns {boolean} - True if this is an infrastructure error
 */
export function isInfrastructureError(error) {
    const errorString = typeof error === "string"
        ? error
        : `${error.code || ""} ${error.message || ""} ${error.name || ""}`;

    return INFRA_ERROR_PATTERNS.some(pattern =>
        errorString.includes(pattern)
    );
}

// ============================================================================
// GRACEFUL SHUTDOWN HANDLER
// ============================================================================

let isShuttingDown = false;
const shutdownCallbacks = [];

/**
 * Register a callback to be called during shutdown
 * @param {Function} callback - Cleanup callback
 */
export function onShutdown(callback) {
    shutdownCallbacks.push(callback);
}

/**
 * Initiate graceful shutdown
 * @param {number} exitCode - Exit code (default: 1)
 * @param {string} reason - Reason for shutdown
 */
export async function gracefulShutdown(exitCode = 1, reason = "Unknown") {
    if (isShuttingDown) return;
    isShuttingDown = true;

    console.error(`🛑 Initiating graceful shutdown. Reason: ${reason}`);

    // Execute all shutdown callbacks with timeout
    const timeout = setTimeout(() => {
        console.error("⚠️ Shutdown timeout reached, forcing exit");
        process.exit(exitCode);
    }, 10000); // 10 second timeout

    try {
        for (const callback of shutdownCallbacks) {
            try {
                await callback();
            } catch (e) {
                console.error("Error during shutdown callback:", e);
            }
        }
    } finally {
        clearTimeout(timeout);
        process.exit(exitCode);
    }
}

// ============================================================================
// ERROR SUMMARY REPORTER
// ============================================================================

/**
 * Get summary of errors in current window
 * @returns {Object} - Error statistics
 */
export function getErrorStats() {
    const now = Date.now();
    let totalErrors = 0;
    let uniqueErrors = 0;
    const topErrors = [];

    for (const [fingerprint, data] of errorCache.entries()) {
        if (now - data.lastSeen < ERROR_WINDOW_MS) {
            totalErrors += data.count;
            uniqueErrors++;
            topErrors.push({
                fingerprint,
                count: data.count,
                firstSeen: data.firstSeen,
                lastSeen: data.lastSeen
            });
        }
    }

    // Sort by count descending
    topErrors.sort((a, b) => b.count - a.count);

    return {
        totalErrors,
        uniqueErrors,
        topErrors: topErrors.slice(0, 10), // Top 10
        windowMs: ERROR_WINDOW_MS,
        timestamp: now
    };
}

export default {
    shouldLogError,
    isInfrastructureError,
    fileLoggerCircuitBreaker,
    mongoLoggerCircuitBreaker,
    hasSufficientDiskSpace,
    calculateBackoff,
    sleep,
    withRetry,
    onShutdown,
    gracefulShutdown,
    getErrorStats
};
