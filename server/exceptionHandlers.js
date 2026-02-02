/**
 * Enhanced Exception Handlers
 * 
 * Replaces the dangerous global exception handlers with:
 * - Exponential backoff for recurring errors
 * - Infrastructure error detection
 * - Graceful shutdown on fatal errors
 * - Rate limiting for identical exceptions
 * 
 * Import this file at the TOP of app.js to replace default handlers
 * 
 * @module exceptionHandlers
 */

import logger from "./logger.resilient.js";
import {
    isInfrastructureError,
    shouldLogError,
    calculateBackoff,
    gracefulShutdown,
    onShutdown,
    getErrorStats
} from "./utils/resilientLogger.js";

// ============================================================================
// FATAL ERROR TRACKING
// ============================================================================

const fatalErrorState = {
    consecutiveErrors: 0,
    lastErrorTime: null,
    isInFatalLoop: false
};

const FATAL_THRESHOLD = 10; // N consecutive errors triggers shutdown
const FATAL_WINDOW_MS = 60000; // Within 1 minute

/**
 * Track fatal errors and trigger shutdown if threshold exceeded
 * @param {Error} error - The error to track
 * @returns {boolean} - True if we should attempt shutdown
 */
function trackFatalError(error) {
    const now = Date.now();

    // Reset counter if errors are spaced out
    if (fatalErrorState.lastErrorTime &&
        now - fatalErrorState.lastErrorTime > FATAL_WINDOW_MS) {
        fatalErrorState.consecutiveErrors = 0;
    }

    fatalErrorState.consecutiveErrors++;
    fatalErrorState.lastErrorTime = now;

    if (fatalErrorState.consecutiveErrors >= FATAL_THRESHOLD) {
        if (!fatalErrorState.isInFatalLoop) {
            fatalErrorState.isInFatalLoop = true;
            return true;
        }
    }

    return false;
}

// ============================================================================
// BACKOFF STATE FOR RECURRING ERRORS
// ============================================================================

let lastErrorBackoff = 0;
let backoffAttempt = 0;
let backoffTimer = null;

/**
 * Apply exponential backoff before processing next error
 * Prevents tight retry loops
 */
async function applyBackoff() {
    if (backoffTimer) {
        return; // Already waiting
    }

    const delay = calculateBackoff(backoffAttempt, 100, 30000);
    backoffAttempt = Math.min(backoffAttempt + 1, 10); // Cap at attempt 10

    // Reset backoff after period of stability
    backoffTimer = setTimeout(() => {
        backoffAttempt = Math.max(0, backoffAttempt - 1);
        backoffTimer = null;
    }, delay * 2);

    // Wait before processing
    await new Promise(resolve => setTimeout(resolve, delay));
}

// ============================================================================
// ENHANCED UNCAUGHT EXCEPTION HANDLER
// ============================================================================

process.on("uncaughtException", async (error) => {
    try {
        // Apply backoff to prevent tight loop
        await applyBackoff();

        // Check if this is an infrastructure error
        const isInfraError = isInfrastructureError(error);

        // Check rate limiting
        const { shouldLog, count, isSummary } = shouldLogError(error);

        if (isInfraError) {
            // Infrastructure errors go to separate log, NOT MongoDB
            logger.infraError?.(`Uncaught Exception (Infrastructure): ${error.message}`, {
                stack: error.stack,
                code: error.code,
                count
            }) || console.error(`[INFRA ERROR] ${error.message}`);

            // Check if we should shutdown
            if (trackFatalError(error)) {
                console.error("🚨 Fatal error loop detected - initiating shutdown");
                await gracefulShutdown(1, `Fatal infrastructure error: ${error.code || error.message}`);
                return;
            }
        } else if (shouldLog) {
            // Application errors can go to MongoDB (rate limited)
            const message = isSummary
                ? `[ERROR STORM] Uncaught Exception occurred ${count}x: ${error.message}`
                : `Uncaught Exception: ${error.message}`;

            logger.error(message, {
                stack: error.stack,
                errorCount: count,
                isSummary
            });
        }

        // Reset backoff on successful logging
        if (!isInfraError) {
            backoffAttempt = Math.max(0, backoffAttempt - 1);
        }

    } catch (loggingError) {
        // Last resort - console only
        console.error("[CRITICAL] Failed to log uncaught exception:", loggingError);
        console.error("[ORIGINAL ERROR]", error);
    }
});

// ============================================================================
// ENHANCED UNHANDLED REJECTION HANDLER
// ============================================================================

process.on("unhandledRejection", async (reason, promise) => {
    try {
        // Apply backoff
        await applyBackoff();

        const error = reason instanceof Error ? reason : new Error(String(reason));
        const isInfraError = isInfrastructureError(error);
        const { shouldLog, count, isSummary } = shouldLogError(error);

        if (isInfraError) {
            logger.infraError?.(`Unhandled Rejection (Infrastructure): ${error.message}`, {
                stack: error.stack,
                count
            }) || console.error(`[INFRA REJECTION] ${error.message}`);

            if (trackFatalError(error)) {
                await gracefulShutdown(1, `Fatal unhandled rejection: ${error.message}`);
                return;
            }
        } else if (shouldLog) {
            const message = isSummary
                ? `[REJECTION STORM] Unhandled Rejection occurred ${count}x: ${reason}`
                : `Unhandled Rejection: ${reason}`;

            logger.error(message, {
                errorCount: count,
                isSummary
            });
        }

    } catch (loggingError) {
        console.error("[CRITICAL] Failed to log unhandled rejection:", loggingError);
        console.error("[ORIGINAL REJECTION]", reason);
    }
});

// ============================================================================
// PERIODIC ERROR STATS REPORTING
// ============================================================================

// Report error statistics every 5 minutes
setInterval(() => {
    const stats = getErrorStats();
    if (stats.totalErrors > 0) {
        console.log(`📊 Error Stats (last minute): ${stats.totalErrors} total, ${stats.uniqueErrors} unique`);

        // If error rate is high, log it
        if (stats.totalErrors > 100) {
            console.warn(`⚠️ High error rate detected: ${stats.totalErrors} errors in last minute`);
        }
    }
}, 300000); // 5 minutes

// ============================================================================
// EXPORT FOR MONITORING
// ============================================================================

export function getExceptionHandlerStats() {
    return {
        fatalState: { ...fatalErrorState },
        backoffState: {
            currentAttempt: backoffAttempt,
            isWaiting: !!backoffTimer
        },
        errorStats: getErrorStats()
    };
}

export default {
    getExceptionHandlerStats
};
