import mongoose from 'mongoose';
import ExJobModel from '../model/export/ExJobModel.mjs';
import dotenv from 'dotenv';
dotenv.config();

async function migrate() {
    try {
        const uri = process.env.PROD_MONGODB_URI || 'mongodb://localhost:27017/export';
        console.log('Connecting to:', uri);
        await mongoose.connect(uri);
        console.log('Connected to MongoDB');

        // Find jobs that have EXP at index 2 (BRANCH/MODE/EXP/...)
        const jobs = await ExJobModel.find({
            job_no: { $regex: /^[^\/]+\/(SEA|AIR)\/EXP\/\d+\/\d{2}-\d{2}$/i }
        }, { _id: 1, job_no: 1 }).lean();

        console.log(`Found ${jobs.length} jobs to reorder.`);

        if (jobs.length === 0) {
            console.log('No jobs to reorder.');
            process.exit(0);
        }

        const bulkOps = [];
        for (const job of jobs) {
            const parts = job.job_no.split('/');
            if (parts.length === 5 && parts[2].toUpperCase() === 'EXP') {
                // BRANCH/MODE/EXP/SERIAL/YEAR -> BRANCH/EXP/MODE/SERIAL/YEAR
                const newJobNo = `${parts[0]}/EXP/${parts[1]}/${parts[3]}/${parts[4]}`.toUpperCase();
                bulkOps.push({
                    updateOne: {
                        filter: { _id: job._id },
                        update: { $set: { job_no: newJobNo, jobNumber: newJobNo } }
                    }
                });
            }
        }

        console.log(`Prepared ${bulkOps.length} reorder operations. Starting execution...`);

        const batchSize = 1000;
        for (let i = 0; i < bulkOps.length; i += batchSize) {
            const batch = bulkOps.slice(i, i + batchSize);
            await ExJobModel.bulkWrite(batch);
            console.log(`Processed ${Math.min(i + batchSize, bulkOps.length)} / ${bulkOps.length} jobs...`);
        }

        console.log(`Successfully reordered ${bulkOps.length} jobs.`);
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

migrate();
