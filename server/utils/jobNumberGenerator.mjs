import JobSequence from "../model/export/JobSequence.mjs";
import ExportJobModel from "../model/export/ExJobModel.mjs";

/**
 * Get the next sequential job number for a given branch and year.
 * Auto-initializes if no counter exists by checking the DB for the highest existing job number.
 * @param {string} branch - Branch code (e.g., AMD, GIM)
 * @param {string} year - Year string (e.g., 25-26)
 * @returns {Promise<string>} - The 5-digit sequence string (e.g., "02811")
 */
export const getNextJobSequence = async (branch, year) => {
    if (!branch || !year) {
        throw new Error("Branch and Year are required to generate job sequence");
    }

    const branchUpper = branch.toUpperCase();

    // Check if counter exists
    let sequenceDoc = await JobSequence.findOne({ branch: branchUpper, year: year });

    if (!sequenceDoc) {
        // Initialize from DB history if missing
        await initializeCounter(branchUpper, year);
    }

    // Atomically increment
    const updatedDoc = await JobSequence.findOneAndUpdate(
        { branch: branchUpper, year: year },
        { $inc: { lastSequence: 1 } },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return updatedDoc.lastSequence.toString().padStart(5, "0");
};

/**
 * Helper to initialize counter from existing ExportJobModel data
 */
async function initializeCounter(branch, year) {
    try {
        // Handle custom format for AIR jobs e.g., branch argument 'AMD-AIR'
        const isAirCounter = branch.endsWith('-AIR');
        const baseBranch = isAirCounter ? branch.replace('-AIR', '') : branch;
        const regexPrefix = isAirCounter ? `^${baseBranch}/AIR/` : `^${baseBranch}/[^/]+/`;

        // Find highest sequence in existing jobs
        const filter = {
            job_no: { $regex: regexPrefix, $options: "i" },
            year: year
        };

        const jobs = await ExportJobModel.find(filter, { job_no: 1 });

        let maxSequence = 0;

        for (const job of jobs) {
            if (!job.job_no) continue;
            const parts = job.job_no.split('/');
            // Look for the numeric part in the middle (index 1 usually, but allow search)
            // Usually BRANCH/SEQ/YEAR -> index 1
            if (parts.length >= 3) {
                const seqPart = parts.find(p => /^\d{3,}$/.test(p)); // heuristic: at least 3 digits
                if (seqPart) {
                    const s = parseInt(seqPart, 10);
                    if (s > maxSequence) maxSequence = s;
                }
            }
        }

        // Create the counter
        // Use upsert mechanism via findOneAndUpdate to handle race conditions gracefully
        // If it exists now, we don't overwrite (using $setOnInsert would be ideal but we want to ensure it acts as init)
        // Actually, just try create and catch duplicate
        try {
            await JobSequence.create({
                branch: branch,
                year: year,
                lastSequence: maxSequence
            });
            console.log(`Initialized JobSequence for ${branch}/${year} at ${maxSequence}`);
        } catch (err) {
            if (err.code !== 11000) throw err;
            // If duplicate, it means initialized concurrently, ignore.
        }

    } catch (error) {
        console.error("Error initializing job sequence counter:", error);
        // Don't throw, proceed to allow basic counter creation (starting at 0)
    }
}

/**
 * Update the job sequence counter if the provided sequence is higher than current.
 * Used when manually entering job numbers or uploading from Excel to ensure
 * future auto-generated numbers don't collide.
 * @param {string} branch - Branch code
 * @param {string} year - Year string
 * @param {number} newSequence - The numeric sequence used (e.g., 2810)
 */
export const updateJobSequenceIfHigher = async (branch, year, newSequence) => {
    if (!branch || !year || !newSequence) return;

    try {
        const branchUpper = branch.toUpperCase();

        // Attempt update first
        const updated = await JobSequence.findOneAndUpdate(
            {
                branch: branchUpper,
                year: year,
                lastSequence: { $lt: newSequence }
            },
            { $set: { lastSequence: newSequence } },
            { new: true }
        );

        if (!updated) {
            // Did not update. Either document missing, or current sequence >= newSequence.
            // Check if doc exists
            const exists = await JobSequence.exists({ branch: branchUpper, year: year });
            if (!exists) {
                // Create it with this sequence
                await JobSequence.create({
                    branch: branchUpper,
                    year: year,
                    lastSequence: newSequence
                });
            }
        }
    } catch (error) {
        if (error.code === 11000) {
            // Race condition on create -> just retry update
            return updateJobSequenceIfHigher(branch, year, newSequence);
        }
        console.error("Error updating job sequence:", error);
    }
};
