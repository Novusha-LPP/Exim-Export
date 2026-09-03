import mongoose from 'mongoose';

const uri = "mongodb://localhost:27017/export";

await mongoose.connect(uri);
const db = mongoose.connection.db;

const existing = await db.collection('freightenquiries').find({ source_job_no: { $exists: true, $ne: '' } }).toArray();

for (const entry of existing) {
  if (!entry.success_no) {
    const success_no = "FF-SUC/EXP/SEA/0001/26-27";
    await db.collection('freightenquiries').updateOne(
      { _id: entry._id },
      { $set: { success_no: success_no, status: "Converted" } }
    );
    console.log(`Updated entry ${entry._id} (${entry.enquiry_no}) -> success_no: ${success_no}`);
    
    // Also update the source export job freight_enquiry_id if applicable
    if (entry.source_job_no) {
      await db.collection('exjobs').updateOne(
        { job_no: entry.source_job_no },
        { $set: { freight_enquiry_id: success_no, freight_done: true } }
      );
      console.log(`Updated exjobs ${entry.source_job_no} -> freight_enquiry_id: ${success_no}`);
    }
  }
}

await mongoose.disconnect();
