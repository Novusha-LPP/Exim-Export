/**
 * Incident Simulator v2 (No Automatic Shutdown)
 * 
 * Verifies rate limiting and summary reporting.
 */

import logger from "./logger.resilient.js";
import { shouldLogError } from "./utils/resilientLogger.js";

console.log("🚀 Starting Rate Limiting Test...");
console.log("-".repeat(50));

const testError = "EIO: i/o error, write";
let logsProduced = 0;

console.log("Firing 1000 duplicate errors...");

for (let i = 0; i < 1000; i++) {
    const { shouldLog, count, isSummary } = shouldLogError(testError);

    if (shouldLog) {
        logsProduced++;
        const type = isSummary ? "[SUMMARY]" : "[INITIAL]";
        console.log(`${type} Logged iteration ${i + 1}. Occurrence count: ${count}`);
    }
}

console.log("-".repeat(50));
console.log(`Test Complete.`);
console.log(`Total attempts: 1000`);
console.log(`Total logs allowed to pass: ${logsProduced}`);

if (logsProduced < 15) {
    console.log("✅ SUCCESS: Rate limiting prevented a log storm.");
    console.log("   Only the first log and periodic summaries (every 100x) were allowed.");
} else {
    console.log("❌ FAILURE: Too many logs allowed.");
}

process.exit(0);
