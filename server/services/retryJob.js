import cron from 'node-cron';
import Handover from  '../model/export/exportHandover.js';
import { handleAutomatedHandover } from './handoverService.js';

// Run every 15 minutes
cron.schedule('*/15 * * * *', async () => {
  const failedHandovers = await Handover.find({ status: 'FAILED', handoverType: 'AUTOMATED' });
  for (const handover of failedHandovers) {
    await handleAutomatedHandover(handover);
  }
});
