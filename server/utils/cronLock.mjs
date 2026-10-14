import mongoose from "mongoose";

/**
 * Enterprise Distributed Cron Lock
 * Prevents duplicate concurrent executions of scheduled jobs across
 * multiple PM2 cluster instances, Docker containers, or horizontal server replicas.
 * 
 * Uses atomic MongoDB operations with Time-To-Live (TTL) expiration.
 */

const lockSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true }, // Job identifier e.g. "dsr_daily_job"
    lockedAt: { type: Date, required: true },
    expiresAt: { type: Date, required: true },
    lockedBy: { type: String, required: true },
    status: { type: String, enum: ["RUNNING", "COMPLETED", "FAILED"], default: "RUNNING" },
    lastDurationMs: { type: Number },
  },
  { collection: "cron_distributed_locks" }
);

// TTL Index to automatically expire orphan locks if a server process abruptly dies
lockSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const CronLock = mongoose.models.CronLock || mongoose.model("CronLock", lockSchema);

/**
 * Wraps any cron job function with an atomic distributed mutex.
 * 
 * @param {string} lockKey - Unique job name (e.g. "dsr_daily_job")
 * @param {number} ttlMs - Maximum time lock can be held in ms (prevents deadlocks if process crashes)
 * @param {Function} jobFn - The async function containing the job logic
 * @returns {Promise<boolean>} - true if job executed, false if skipped due to concurrent execution
 */
export async function withDistributedLock(lockKey, ttlMs, jobFn) {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ttlMs);
  const processIdentifier = `${process.pid}@${process.env.HOSTNAME || "node-instance"}-${Math.random().toString(36).substring(7)}`;

  let lockAcquired = false;

  try {
    // Atomically acquire the lock if:
    // 1. Lock record does not exist yet (upsert), OR
    // 2. Existing lock has expired (previous run crashed or finished)
    const acquired = await CronLock.findOneAndUpdate(
      {
        _id: lockKey,
        $or: [
          { expiresAt: { $lt: now } },
          { status: { $in: ["COMPLETED", "FAILED"] } }
        ],
      },
      {
        $set: {
          lockedAt: now,
          expiresAt: expiresAt,
          lockedBy: processIdentifier,
          status: "RUNNING",
        },
      },
      { upsert: false, new: true }
    );

    if (acquired && acquired.lockedBy === processIdentifier) {
      lockAcquired = true;
    } else {
      // If document didn't exist, try atomic insert
      try {
        await CronLock.create({
          _id: lockKey,
          lockedAt: now,
          expiresAt: expiresAt,
          lockedBy: processIdentifier,
          status: "RUNNING",
        });
        lockAcquired = true;
      } catch (insertErr) {
        // E11000 duplicate key error means another instance won the race
        lockAcquired = false;
      }
    }

    if (!lockAcquired) {
      console.log(`[Distributed Lock] 🔒 Job "${lockKey}" is currently running on another instance. Skipping to prevent duplicate execution.`);
      return false;
    }

    console.log(`[Distributed Lock] 🔑 Lock acquired for "${lockKey}" by process ${processIdentifier}. Executing job...`);
    const startTime = Date.now();

    try {
      await jobFn();
      const duration = Date.now() - startTime;

      // Mark completed
      await CronLock.updateOne(
        { _id: lockKey, lockedBy: processIdentifier },
        {
          $set: {
            status: "COMPLETED",
            expiresAt: new Date(Date.now() + 60 * 1000), // Keep lock for 1 minute post-completion to prevent immediate re-runs
            lastDurationMs: duration,
          },
        }
      ).catch(() => {});

      console.log(`[Distributed Lock] ✅ Job "${lockKey}" completed in ${(duration / 1000).toFixed(2)}s.`);
      return true;
    } catch (jobError) {
      const duration = Date.now() - startTime;
      await CronLock.updateOne(
        { _id: lockKey, lockedBy: processIdentifier },
        {
          $set: {
            status: "FAILED",
            expiresAt: new Date(), // Release immediately on failure
            lastDurationMs: duration,
          },
        }
      ).catch(() => {});

      console.error(`[Distributed Lock] ❌ Job "${lockKey}" failed:`, jobError);
      throw jobError;
    }
  } catch (err) {
    if (lockAcquired) {
      // Release lock on unhandled error
      await CronLock.deleteOne({ _id: lockKey, lockedBy: processIdentifier }).catch(() => {});
    }
    throw err;
  }
}

export default withDistributedLock;
