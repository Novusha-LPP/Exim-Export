/**
 * Health Check Routes
 * 
 * Provides system health monitoring endpoints:
 * - /api/health - Full system health status
 * - /api/health/ready - Simple readiness check
 * - /api/health/live - Liveness probe
 * 
 * @module routes/health
 */

import express from "express";
import mongoose from "mongoose";
import os from "os";

const router = express.Router();

/**
 * MongoDB connection state labels
 */
const MONGO_STATE_LABELS = {
    0: "disconnected",
    1: "connected",
    2: "connecting",
    3: "disconnecting"
};

/**
 * GET /api/health
 * 
 * Returns comprehensive system health information.
 * Used for monitoring dashboards and alerting.
 */
router.get("/health", async (req, res) => {
    try {
        const mongoState = mongoose.connection.readyState;
        const isMongoHealthy = mongoState === 1;

        // Get memory usage
        const memUsage = process.memoryUsage();
        const totalMem = os.totalmem();
        const freeMem = os.freemem();

        // System load (Unix only, returns [0,0,0] on Windows)
        const loadAvg = os.loadavg();

        // Build health response
        const health = {
            status: isMongoHealthy ? "healthy" : "degraded",
            timestamp: new Date().toISOString(),

            // Process info
            process: {
                uptime: process.uptime(),
                pid: process.pid,
                nodeVersion: process.version
            },

            // Memory usage
            memory: {
                heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + "MB",
                heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + "MB",
                rss: Math.round(memUsage.rss / 1024 / 1024) + "MB",
                external: Math.round(memUsage.external / 1024 / 1024) + "MB",
                systemFree: Math.round(freeMem / 1024 / 1024) + "MB",
                systemTotal: Math.round(totalMem / 1024 / 1024) + "MB",
                usagePercent: Math.round((1 - freeMem / totalMem) * 100) + "%"
            },

            // MongoDB status
            mongodb: {
                status: MONGO_STATE_LABELS[mongoState],
                connected: isMongoHealthy,
                host: mongoose.connection.host || "unknown",
                name: mongoose.connection.name || "unknown"
            },

            // System load
            system: {
                platform: process.platform,
                cpus: os.cpus().length,
                loadAverage: {
                    "1m": loadAvg[0].toFixed(2),
                    "5m": loadAvg[1].toFixed(2),
                    "15m": loadAvg[2].toFixed(2)
                }
            }
        };

        // Add logger health if available
        try {
            const logger = await import("../logger.js");
            if (logger.default?.getHealth) {
                health.logger = logger.default.getHealth();
            }
        } catch (e) {
            // Logger health not available
        }

        // Return with appropriate status code
        const statusCode = health.status === "healthy" ? 200 : 503;
        res.status(statusCode).json(health);

    } catch (error) {
        res.status(503).json({
            status: "error",
            timestamp: new Date().toISOString(),
            error: error.message
        });
    }
});

/**
 * GET /api/health/ready
 * 
 * Kubernetes readiness probe.
 * Returns 200 if the service is ready to accept traffic.
 */
router.get("/health/ready", (req, res) => {
    const isReady = mongoose.connection.readyState === 1;

    if (isReady) {
        res.status(200).json({
            ready: true,
            timestamp: new Date().toISOString()
        });
    } else {
        res.status(503).json({
            ready: false,
            timestamp: new Date().toISOString(),
            reason: "MongoDB not connected"
        });
    }
});

/**
 * GET /api/health/live
 * 
 * Kubernetes liveness probe.
 * Returns 200 if the process is alive.
 */
router.get("/health/live", (req, res) => {
    res.status(200).json({
        alive: true,
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

/**
 * GET /api/health/bandwidth
 * 
 * Returns bandwidth-related statistics.
 * Useful for monitoring after the incident.
 */
router.get("/health/bandwidth", async (req, res) => {
    try {
        const db = mongoose.connection.db;

        // Get collection stats for serverlogs
        let logStats = { count: 0, storageSize: 0 };
        try {
            logStats = await db.collection("serverlogs").stats();
        } catch (e) {
            // Collection might not exist
        }

        // Get collection stats for audittrails
        let auditStats = { count: 0, storageSize: 0 };
        try {
            auditStats = await db.collection("audittrails").stats();
        } catch (e) {
            // Collection might not exist
        }

        res.json({
            timestamp: new Date().toISOString(),
            serverlogs: {
                count: logStats.count || 0,
                sizeBytes: logStats.storageSize || 0,
                sizeMB: Math.round((logStats.storageSize || 0) / 1024 / 1024 * 100) / 100
            },
            audittrails: {
                count: auditStats.count || 0,
                sizeBytes: auditStats.storageSize || 0,
                sizeMB: Math.round((auditStats.storageSize || 0) / 1024 / 1024 * 100) / 100
            },
            alert: (logStats.count || 0) > 10000
                ? "WARNING: High log count detected!"
                : null
        });

    } catch (error) {
        res.status(500).json({
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

export default router;
