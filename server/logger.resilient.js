/**
 * Enhanced Resilient Logger
 * 
 * This logger replaces the original logger.js with:
 * - Rate limiting for identical errors
 * - Circuit breaker for file/MongoDB transports
 * - Disk space checking before file writes
 * - Infrastructure error separation (no MongoDB logging for disk errors)
 * - Exponential backoff for transient failures
 * 
 * @module logger
 */

import { createLogger, format, transports } from "winston";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import "winston-mongodb";
import dotenv from "dotenv";
import {
    shouldLogError,
    isInfrastructureError,
    fileLoggerCircuitBreaker,
    mongoLoggerCircuitBreaker,
    hasSufficientDiskSpace,
    onShutdown
} from "./utils/resilientLogger.js";

dotenv.config();

const MONGODB_URI =
    process.env.NODE_ENV === "production"
        ? process.env.PROD_MONGODB_URI
        : process.env.NODE_ENV === "server"
            ? process.env.SERVER_MONGODB_URI
            : process.env.DEV_MONGODB_URI;

// Convert the URL to a file path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure log directory exists
const logDirectory = path.join(__dirname, "logs");
fs.existsSync(logDirectory) || fs.mkdirSync(logDirectory);

// ============================================================================
// CUSTOM TRANSPORTS WITH CIRCUIT BREAKER PROTECTION
// ============================================================================

/**
 * Protected File Transport - respects circuit breaker and checks disk space
 */
class ProtectedFileTransport extends transports.File {
    constructor(opts) {
        super(opts);
        this.logPath = opts.dirname || logDirectory;
    }

    async log(info, callback) {
        // Check circuit breaker
        if (!fileLoggerCircuitBreaker.canExecute()) {
            return callback();
        }

        // Check disk space (async, but use cached result)
        const hasSpace = await hasSufficientDiskSpace(this.logPath);
        if (!hasSpace) {
            fileLoggerCircuitBreaker.recordFailure();
            console.error("⚠️ Disk space low, file logging disabled");
            return callback();
        }

        try {
            super.log(info, (err) => {
                if (err) {
                    fileLoggerCircuitBreaker.recordFailure();
                    // Don't throw - just fail silently
                } else {
                    fileLoggerCircuitBreaker.recordSuccess();
                }
                callback(err);
            });
        } catch (error) {
            fileLoggerCircuitBreaker.recordFailure();
            callback();
        }
    }
}

/**
 * Protected MongoDB Transport - respects circuit breaker and rejects infra errors
 */
class ProtectedMongoDBTransport extends transports.MongoDB {
    constructor(opts) {
        // Reduce retry attempts
        const safeOpts = {
            ...opts,
            tryReconnect: false, // Don't reconnect indefinitely
            capped: true,
            cappedMax: 100000, // Max 100k log entries
            cappedSize: 104857600, // 100MB cap
            metaKey: 'metadata',
            storeHost: false,
        };
        super(safeOpts);
    }

    log(info, callback) {
        // Check circuit breaker
        if (!mongoLoggerCircuitBreaker.canExecute()) {
            return callback();
        }

        // CRITICAL: Don't log infrastructure errors to MongoDB
        // This prevents the infinite loop!
        if (info.isInfraError || isInfrastructureError(info.message)) {
            console.warn("⚠️ Infrastructure error - skipping MongoDB log:",
                info.message?.substring(0, 100));
            return callback();
        }

        try {
            super.log(info, (err) => {
                if (err) {
                    mongoLoggerCircuitBreaker.recordFailure();
                } else {
                    mongoLoggerCircuitBreaker.recordSuccess();
                }
                callback(err);
            });
        } catch (error) {
            mongoLoggerCircuitBreaker.recordFailure();
            callback();
        }
    }
}

// ============================================================================
// CUSTOM FORMATTING
// ============================================================================

let logCounter = 0;

const customFormat = format.printf(({ level, message, stack, timestamp, errorCount, isSummary }) => {
    const countInfo = errorCount && errorCount > 1
        ? ` (occurred ${errorCount}x)`
        : "";
    const summaryInfo = isSummary ? " [SUMMARY]" : "";

    return `${timestamp} [${level}] ${++logCounter}${summaryInfo}${countInfo}: ${message}${stack ? "\nStack Trace:\n" + stack : ""
        }`;
});

const baseFormat = format.combine(
    format.timestamp({
        format: "DD-MM-YYYY HH:mm:ss",
    }),
    format.errors({ stack: true }),
    customFormat
);

// ============================================================================
// CREATE PROTECTED LOGGER
// ============================================================================

const logger = createLogger({
    level: "error",
    format: baseFormat,
    transports: [
        // Protected File Transport
        new ProtectedFileTransport({
            filename: path.join(
                logDirectory,
                process.env.NODE_ENV === "production"
                    ? "prod-error.log"
                    : "dev-error.log"
            ),
            level: "error",
            dirname: logDirectory,
            maxsize: 10485760, // 10MB max file size
            maxFiles: 5, // Keep 5 rotated files
            tailable: true,
        }),

        // Console transport (non-production only)
        ...(process.env.NODE_ENV !== "production"
            ? [
                new transports.Console({
                    format: format.combine(format.colorize(), baseFormat),
                }),
            ]
            : []),

        // Protected MongoDB Transport
        new ProtectedMongoDBTransport({
            level: "error",
            db: MONGODB_URI,
            collection: "serverlogs",
            format: format.combine(format.timestamp(), format.json()),
        }),
    ],
});

// ============================================================================
// RATE-LIMITED LOGGING WRAPPER
// ============================================================================

/**
 * Original logger.error function
 */
const originalError = logger.error.bind(logger);

/**
 * Rate-limited error logging
 * Prevents log storms by deduplicating identical errors
 */
logger.error = function (message, ...args) {
    const { shouldLog, count, isSummary, windowExpired } = shouldLogError(message);

    if (!shouldLog) {
        return; // Skip - duplicate within window
    }

    // Add metadata about occurrences
    const meta = args[0] || {};
    if (isSummary) {
        const summaryMessage = windowExpired
            ? `[ERROR SUMMARY] Previous error occurred ${count}x in last minute: ${message}`
            : `[ERROR CONTINUING] Error has occurred ${count}x: ${message}`;

        originalError(summaryMessage, {
            ...meta,
            errorCount: count,
            isSummary: true
        });
    } else {
        originalError(message, {
            ...meta,
            errorCount: count
        });
    }
};

/**
 * Log infrastructure errors (disk, network, etc.)
 * These are logged to console only, NOT MongoDB
 */
logger.infraError = function (message, meta = {}) {
    console.error(`🔴 [INFRASTRUCTURE ERROR] ${new Date().toISOString()}: ${message}`);
    if (meta.stack) {
        console.error(meta.stack);
    }

    // Write to a separate infra log file (best effort)
    if (fileLoggerCircuitBreaker.canExecute()) {
        try {
            const infraLogPath = path.join(logDirectory, "infrastructure-errors.log");
            fs.appendFileSync(infraLogPath,
                `${new Date().toISOString()} ${message}\n${meta.stack || ""}\n\n`
            );
        } catch (e) {
            // Fail silently - we can't log if disk is the problem
        }
    }
};

// ============================================================================
// HEALTH CHECK ENDPOINT DATA
// ============================================================================

/**
 * Get logger health status for monitoring
 */
logger.getHealth = function () {
    return {
        fileCircuitBreaker: fileLoggerCircuitBreaker.getState(),
        mongoCircuitBreaker: mongoLoggerCircuitBreaker.getState(),
        timestamp: new Date().toISOString()
    };
};

// ============================================================================
// CLEANUP ON SHUTDOWN
// ============================================================================

onShutdown(async () => {
    console.log("🔄 Flushing logger...");
    // Give transports time to flush
    await new Promise(resolve => setTimeout(resolve, 1000));
});

export default logger;
