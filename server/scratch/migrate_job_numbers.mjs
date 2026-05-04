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

        // Find jobs that have 4 parts and don't already have EXP
        const jobs = await ExJobModel.find({
            job_no: { $regex: /^[^\/]+\/(SEA|AIR)\/\d+\/\d{2}-\d{2}$/i }
        });

        console.log(`Found ${jobs.length} jobs to migrate.`);

        let count = 0;
        for (const job of jobs) {
            const parts = job.job_no.split('/');
            if (parts.length === 4) {
                // BRANCH/MODE/SERIAL/YEAR -> BRANCH/MODE/EXP/SERIAL/YEAR
                const newJobNo = `${parts[0]}/${parts[1]}/EXP/${parts[2]}/${parts[3]}`.toUpperCase();

                await ExJobModel.updateOne(
                    { _id: job._id },
                    { $set: { job_no: newJobNo, jobNumber: newJobNo } }
                );
                count++;
            }
        }

        console.log(`Successfully migrated ${count} jobs.`);

        // Also update any references in charges if they exist (PB numbers might be based on job numbers)
        // But the user didn't explicitly ask for PB/R migration, just "migration script to add EXP after transport mode"
        // referring to the job number format.

        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

migrate();
