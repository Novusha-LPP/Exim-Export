import mongoose from 'mongoose';
import JobSequence from '../model/export/JobSequence.mjs';
import ExJobModel from '../model/export/ExJobModel.mjs';
import dotenv from 'dotenv';
dotenv.config();

async function sync() {
    try {
        const uri = process.env.PROD_MONGODB_URI || 'mongodb://localhost:27017/export';
        console.log('Connecting to:', uri);
        await mongoose.connect(uri);
        console.log('Connected to MongoDB');

        // Get all unique branch/year combinations from JobSequence
        const sequences = await JobSequence.find();
        console.log(`Found ${sequences.length} sequence counters to sync.`);

        for (const seq of sequences) {
            const { branch, year } = seq;
            const isAir = branch.endsWith('-AIR');
            const isSea = branch.endsWith('-SEA');
            const baseBranch = branch.replace(/-AIR|-SEA/i, '');

            const regexPrefix = isAir ? `^${baseBranch}/AIR/EXP/` : `^${baseBranch}/SEA/EXP/`;

            // Find the highest sequence number for this branch/year
            const jobs = await ExJobModel.find({
                job_no: { $regex: regexPrefix, $options: 'i' },
                year: year
            }, { job_no: 1 }).lean();

            let maxSequence = 0;
            for (const job of jobs) {
                const parts = job.job_no.split('/');
                // Format: BRANCH/MODE/EXP/SERIAL/YEAR
                if (parts.length === 5) {
                    const serial = parseInt(parts[3], 10);
                    if (!isNaN(serial) && serial > maxSequence) {
                        maxSequence = serial;
                    }
                }
            }

            if (maxSequence > seq.lastSequence) {
                console.log(`Updating ${branch}/${year}: ${seq.lastSequence} -> ${maxSequence}`);
                await JobSequence.updateOne(
                    { _id: seq._id },
                    { $set: { lastSequence: maxSequence } }
                );
            } else {
                console.log(`Skipping ${branch}/${year}: current ${seq.lastSequence} is already >= ${maxSequence}`);
            }
        }

        console.log('Sync complete.');
        process.exit(0);
    } catch (error) {
        console.error('Sync failed:', error);
        process.exit(1);
    }
}

sync();
