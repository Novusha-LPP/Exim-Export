import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import XLSX from 'xlsx';
import ChargeHeadModel from './model/export/chargesHead.mjs';

dotenv.config();

const MONGODB_URI =
  process.env.NODE_ENV === "production"
    ? process.env.PROD_MONGODB_URI
    : process.env.NODE_ENV === "server"
      ? process.env.SERVER_MONGODB_URI
      : process.env.DEV_MONGODB_URI;

const filePath = 'c:/Users/india/Desktop/projects/Exim-Export/client/src/charges123.xlsx';

async function reimportCharges() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB');

        // Delete all non-system charges first
        const delRes = await ChargeHeadModel.deleteMany({ isSystem: false });
        console.log(`Deleted ${delRes.deletedCount} non-system charges.`);

        const workbook = XLSX.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        // Headers are on Index 2. Data starts at Index 3.
        const chargesToProcess = data.slice(3);
        
        let successCount = 0;
        let errorCount = 0;

        for (const row of chargesToProcess) {
            const row_name = row[0];
            const row_code = row[1];
            const row_cat = row[4] || 'Miscellaneous';

            if (!row_name) continue;

            const trimmedName = row_name.toString().trim();
            const trimmedCat = row_cat.toString().trim();

            try {
                // To avoid duplicate names (since the DB has a unique constraint), 
                // we'll check if it exists. If so, we'll append the code.
                const existing = await ChargeHeadModel.findOne({ name: trimmedName });
                let finalName = trimmedName;
                if (existing) {
                    finalName = `${trimmedName} (${row_code})`;
                }

                await ChargeHeadModel.create({
                    name: finalName,
                    category: trimmedCat,
                    isSystem: false,
                    isActive: true
                });
                successCount++;
            } catch (err) {
                console.error(`Error adding ${finalName}:`, err.message);
                errorCount++;
            }
        }

        console.log(`Import complete!`);
        console.log(`Success: ${successCount}`);
        console.log(`Errors: ${errorCount}`);

    } catch (error) {
        console.error('Fatal error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

reimportCharges();
