import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

import { ExContainer } from '../model/export/normalized/ExContainerModel.mjs';
import { ExInvoice } from '../model/export/normalized/ExInvoiceModel.mjs';

async function check() {
  await mongoose.connect('mongodb://localhost:27017/export');
  const jobNo = 'AMD/EXP/SEA/00513/26-27';
  const containers = await ExContainer.find({ job_no: jobNo }).lean();
  console.log(`Containers in local ex_containers for ${jobNo}:`, containers.length);
  containers.forEach(c => console.log(' - ' + c.containerNo + ' grossWeight: ' + c.grossWeight + ' pkgsStuffed: ' + c.pkgsStuffed));

  const invoices = await ExInvoice.find({ job_no: jobNo }).lean();
  console.log(`Invoices in local ex_invoices for ${jobNo}:`, invoices.length);
  invoices.forEach(inv => console.log(' - ' + inv.invoiceNumber + ' value: ' + inv.invoiceValue));

  await mongoose.disconnect();
}

check();
