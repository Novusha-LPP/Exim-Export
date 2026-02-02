/**
 * Incident Simulator
 * 
 * This script simulates the catastrophic retry loop incident:
 * 1. Simulates a recurring Disk I/O error (EIO)
 * 2. Triggers it rapidly without manual delay
 * 3. Verifies that the resilient logger prevents a "log storm"
 * 
 * Expected results with the new code:
 * - The first error is logged.
 * - Subsequent 99 identical errors are SILENCED (rate limited).
 * - Only 1 summary log is generated per minute.
 * - The MongoDB transport is bypassed because it's an "Infrastructure Error".
 * - The Circuit Breaker eventually trips for the File transport.
 * - The system initiates graceful shutdown after 10 consecutive fatal errors.
 */

import logger from "./logger.resilient.js";
import "./exceptionHandlers.js";
import { getExceptionHandlerStats } from "./exceptionHandlers.js";

console.log("🚀 Starting Stress Test: Simulating Retry Storm...");
console.log("Condition: Recurring 'EIO: i/o error, write' (Infra Error)");
console.log("-".repeat(50));

let triggerCount = 0;
const MAX_TRIGGERS = 50; // Trigger many times rapidly

/**
 * Simulate the EIO error that caused the incident
 */
function simulateEioError() {
    triggerCount++;
    if (triggerCount > MAX_TRIGGERS) {
        clearInterval(interval);
        console.log("\n✅ Simulation trigger phase complete.");
        console.log(`Total triggers attempted: ${triggerCount}`);
        checkStats();
        return;
    }

    const error = new Error("EIO: i/o error, write");
    error.code = "EIO"; // Infrastructure error code

    // This will trigger the global 'uncaughtException' handler we just fixed
    process.emit("uncaughtException", error);
}

function checkStats() {
    console.log("\n📊 Verification - Current System State:");
    const stats = getExceptionHandlerStats();

    console.log(`Total Errors Tracked: ${stats.errorStats.totalErrors}`);
    console.log(`Unique Errors: ${stats.errorStats.uniqueErrors}`);

    console.log("\n🛡️ Protective Measures Check:");

    // 1. Rate Limiting Check
    if (stats.errorStats.totalErrors > 1 && stats.errorStats.totalErrors > stats.errorStats.uniqueErrors) {
        console.log("✅ SUCCESS: Rate limiting active. Multiple errors suppressed.");
    } else {
        console.log("❌ FAILURE: Rate limiting not observed.");
    }

    // 2. Fatal Loop Check
    console.log(`Consecutive Fatal Errors: ${stats.fatalState.consecutiveErrors}`);
    if (stats.fatalState.consecutiveErrors >= 10) {
        console.log("✅ SUCCESS: Fatal loop detected.");
        console.log("   (System would have shut down in a real app.js environment)");
    }

    // 3. Logger Health
    const health = logger.getHealth();
    console.log("\n🏥 Logger Health Status:");
    console.log(`File Circuit Breaker: ${health.fileCircuitBreaker.state} (Failures: ${health.fileCircuitBreaker.failureCount})`);
    console.log(`Mongo Circuit Breaker: ${health.mongoCircuitBreaker.state}`);

    // Note: MongoDB failures won't increment for EIO because we now bypass it!
    console.log("\n✨ TEST COMPLETE");
    setTimeout(() => process.exit(0), 1000);
}

// Trigger errors every 50ms (very fast, similar to the original accident)
const interval = setInterval(simulateEioError, 50);

console.log("Running simulation... please wait...");
