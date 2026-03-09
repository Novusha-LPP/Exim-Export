import mongoose from 'mongoose';

async function migrate() {
    console.log('Starting migration...');
    await mongoose.connect('mongodb+srv://exim:I9y5bcMUHkGHpgq2@exim.xya3qh0.mongodb.net/export');
    const db = mongoose.connection.db;

    console.log(db);

    const exportJobs = db.collection('exportjobs');
    const auditTrails = db.collection('exportaudittrails');

    // Find all documents where job_no does not contain /AIR/ or /SEA/ 
    const jobsToMigrate = await exportJobs.find({
        job_no: { $not: /\/AIR\/|\/SEA\//i }
    }).toArray();

    console.log('Found ' + jobsToMigrate.length + ' historical jobs to migrate.');

    let successCount = 0;
    for (const job of jobsToMigrate) {
        if (!job.job_no || typeof job.job_no !== 'string') continue;

        const oldJobNo = job.job_no;
        const parts = oldJobNo.split('/');

        // Ensure standard format BRANCH/SEQ/YEAR or similar
        const seqIndex = parts.findIndex(p => /^\d{3,}$/.test(p));
        if (seqIndex === -1 && parts.length < 2) {
            continue;
        }

        const isAir = (job.transportMode && String(job.transportMode).toUpperCase().includes('AIR')) ||
            (job.consignmentType && String(job.consignmentType).toUpperCase().includes('AIR'));

        const isSea = (job.transportMode && String(job.transportMode).toUpperCase().includes('SEA')) ||
            (job.consignmentType && ['FCL', 'LCL'].includes(String(job.consignmentType).toUpperCase())) ||
            (!isAir); // Default to Sea if not Air

        const mode = isAir ? 'AIR' : 'SEA';

        let newJobNo;
        if (seqIndex > 0) {
            const newParts = [...parts];
            if (newParts.includes(mode)) continue;
            newParts.splice(seqIndex, 0, mode);
            newJobNo = newParts.join('/');
        } else if (parts.length >= 2) {
            const newParts = [...parts];
            if (newParts.includes(mode)) continue;
            newParts.splice(1, 0, mode);
            newJobNo = newParts.join('/');
        } else {
            console.log('Skip weird format: ' + oldJobNo);
            continue;
        }

        // Check for collision
        const clash = await exportJobs.findOne({ job_no: newJobNo });
        if (clash) {
            console.log('Collision skip: ' + newJobNo + ' already exists.');
            continue;
        }

        // Update DB
        await exportJobs.updateOne({ _id: job._id }, { $set: { job_no: newJobNo, jobNumber: newJobNo } });
        await auditTrails.updateMany({ job_no: oldJobNo }, { $set: { job_no: newJobNo } });

        successCount++;
        if (successCount <= 5) console.log('Migrated ' + oldJobNo + ' -> ' + newJobNo);
    }

    console.log('Total successfully migrated: ' + successCount);
    process.exit(0);
}

migrate().catch(err => {
    console.error(err);
    process.exit(1);
});
