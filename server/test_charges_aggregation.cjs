const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: './.env' });
dotenv.config();

const uri = process.env.NODE_ENV === 'production' ? process.env.PROD_MONGODB_URI : (process.env.DEV_MONGODB_URI || process.env.SERVER_MONGODB_URI);

async function testApi() {
    await mongoose.connect(uri.trim());

    const ExJobModel = mongoose.model('ExportJob', new mongoose.Schema({}, { strict: false }));

    // Test Parent: GIM/EXP/SEA/00359/26-27
    const parent = await ExJobModel.findById('6acc9c19f399ef21c8abcee0');
    console.log('Parent Job:', parent?.job_no, '| is_parent:', parent?.is_club_job_parent, '| clubbed_jobs:', parent?.clubbed_jobs);

    let allChargesParent = [...(parent.charges || [])].map(c => ({
        head: c.chargeHead,
        sourceJobNo: parent.job_no
    }));

    if (parent.is_club_job_parent && Array.isArray(parent.clubbed_jobs) && parent.clubbed_jobs.length > 0) {
        const childJobNos = parent.clubbed_jobs.filter(j => j && j !== parent.job_no);
        const childJobs = await ExJobModel.find({ job_no: { $in: childJobNos } }).lean();
        for (const child of childJobs) {
            if (Array.isArray(child.charges)) {
                for (const cc of child.charges) {
                    allChargesParent.push({
                        head: cc.chargeHead,
                        sourceJobNo: child.job_no
                    });
                }
            }
        }
    }

    console.log('\n--- Parent Charges Result (Merged in GET /charges) ---');
    console.log('Total Charges:', allChargesParent.length);
    allChargesParent.forEach(c => console.log(`  - [${c.head}] from ${c.sourceJobNo}`));

    // Test Child: GIM/EXP/SEA/00360/26-27
    const child = await ExJobModel.findById('6acc9f24a2e6d38f178f994b');
    console.log('\n--- Child Job Result (Individual in GET /charges) ---');
    console.log('Job:', child?.job_no);
    let allChargesChild = [...(child.charges || [])].map(c => ({
        head: c.chargeHead,
        sourceJobNo: child.job_no
    }));
    console.log('Total Charges:', allChargesChild.length);
    allChargesChild.forEach(c => console.log(`  - [${c.head}] from ${c.sourceJobNo}`));

    await mongoose.disconnect();
}

testApi().catch(err => {
    console.error(err);
    process.exit(1);
});
