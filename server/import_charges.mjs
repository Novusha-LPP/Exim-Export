import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import ChargeHeadModel from './model/export/chargesHead.mjs';

dotenv.config();

const MONGODB_URI =
  process.env.NODE_ENV === "production"
    ? process.env.PROD_MONGODB_URI
    : process.env.NODE_ENV === "server"
      ? process.env.SERVER_MONGODB_URI
      : process.env.DEV_MONGODB_URI;

async function importCharges() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB');

        const chargesData = JSON.parse(fs.readFileSync('../extracted_charges.json', 'utf8'));
        
        let successCount = 0;
        let skippedCount = 0;
        let errorCount = 0;

        // Skip the header (row 1 is "Code" / "Applicable For")
        const chargesToProcess = chargesData.slice(1);

        for (const charge of chargesToProcess) {
            const { name, category } = charge;
            
            if (!name || name === 'Code' || typeof name !== 'string') continue;

            const trimmedName = name.trim();
            const trimmedCategory = category ? category.trim() : 'Miscellaneous';

            try {
                // Check if already exists (case-insensitive)
                // Escape special characters for regex
                const escapedName = trimmedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const existing = await ChargeHeadModel.findOne({ name: { $regex: new RegExp(`^${escapedName}$`, 'i') } });
                
                if (existing) {
                    skippedCount++;
                    continue;
                }

                await ChargeHeadModel.create({
                    name: trimmedName,
                    category: trimmedCategory,
                    isSystem: false
                });
                successCount++;
            } catch (err) {
                console.error(`Error adding ${trimmedName}:`, err.message);
                errorCount++;
            }
        }

        console.log(`Import complete!`);
        console.log(`Success: ${successCount}`);
        console.log(`Skipped (existing): ${skippedCount}`);
        console.log(`Errors: ${errorCount}`);

    } catch (error) {
        console.error('Fatal import error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

importCharges();
