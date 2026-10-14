import mongoose from 'mongoose';

async function main() {
  try {
    await mongoose.connect('mongodb://localhost:27017/export');
    const db = mongoose.connection.db;
    const job = await db.collection('exportjobs').findOne({ 'containers.0': { $exists: true } });
    if (job) {
      console.log('Sample job_no:', job.job_no);
      console.log('Containers count:', job.containers?.length || 0);
      console.log('Invoices count:', job.invoices?.length || 0);
      console.log('Operations count:', job.operations?.length || 0);
      const jsonStr = JSON.stringify(job);
      console.log('Document byte size (JSON):', Buffer.byteLength(jsonStr), 'bytes');
    } else {
      console.log('No job with containers found');
    }
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await mongoose.disconnect();
  }
}

main();
