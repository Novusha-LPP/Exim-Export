import mongoose from 'mongoose';
import dotenv from 'dotenv';
import ChargeHeadModel from './model/export/chargesHead.mjs';

dotenv.config();

const MONGODB_URI = process.env.SERVER_MONGODB_URI || process.env.DEV_MONGODB_URI;

async function migrate() {
    try {
        if (!MONGODB_URI) {
            console.error("MONGODB_URI not found in environment variables.");
            process.exit(1);
        }

        await mongoose.connect(MONGODB_URI);
        console.log("Connected to MongoDB for migration...");
        const collection = mongoose.connection.db.collection('chargeheads');

        // Drop unique index on chargeHead if it exists to avoid 11000 error during unset
        try {
            await collection.dropIndex("chargeHead_1");
            console.log("Dropped index chargeHead_1");
        } catch (e) {
            console.log("Index chargeHead_1 not found or already dropped.");
        }

        const records = await collection.find({}).toArray();

        console.log(`Found ${records.length} records to process.`);

        let updatedCount = 0;
        for (const record of records) {
            const updates = {};

            // 1. Map name from 'CHARGE NAMES' or 'chargeHead'
            const rawName = record['CHARGE NAMES'] || record.chargeHead || record.name;
            if (rawName && !record.name) {
                updates.name = rawName.toString().trim().toUpperCase();
            }

            // 2. Map chargeType and category from 'CATEGORY' or 'chargeCategory'
            const rawCatField = record['CATEGORY'] || record.chargeCategory || record.category;
            if (rawCatField) {
                const rawCat = rawCatField.toString().toUpperCase().trim();
                
                if (rawCat === 'REIMBURSEMENT') {
                    updates.chargeType = 'Reimbursement';
                    updates.category = record.category || 'Service Charge';
                } else if (rawCat === 'MARGIN') {
                    updates.chargeType = 'Margin';
                    updates.category = record.category || 'Service Charge';
                } else {
                    updates.category = rawCat;
                    if (!record.chargeType) updates.chargeType = 'Margin';
                }
            }

            // 3. Set Schema Defaults
            if (record.isActive === undefined) updates.isActive = true;
            if (record.isPbMandatory === undefined) updates.isPbMandatory = false;
            if (record.isSystem === undefined) updates.isSystem = false;
            if (!record.createdAt) updates.createdAt = new Date();
            if (!record.updatedAt) updates.updatedAt = new Date();

            if (Object.keys(updates).length > 0) {
                await collection.updateOne(
                    { _id: record._id },
                    { 
                        $set: updates,
                        $unset: { 
                            'CHARGE NAMES': "", 
                            'CATEGORY': "", 
                            'chargeHead': "", 
                            'chargeCategory': "" 
                        } 
                    }
                );
                updatedCount++;
            }
        }

        console.log(`Migration completed. Updated ${updatedCount} records.`);
        process.exit(0);
    } catch (error) {
        console.error("Migration failed:", error);
        process.exit(1);
    }
}

migrate();
