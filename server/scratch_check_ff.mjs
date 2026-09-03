import mongoose from 'mongoose';

const uri = "mongodb://localhost:27017/export";

await mongoose.connect(uri);
const db = mongoose.connection.db;

const entries = await db.collection('freightenquiries').find({}).toArray();

console.log('Total entries:', entries.length);
entries.forEach(e => console.log(`ID: ${e._id} | ENQ: ${e.enquiry_no} | SUC: ${e.success_no} | Status: ${e.status} | SourceJob: ${e.source_job_no}`));

await mongoose.disconnect();
