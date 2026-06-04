import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from the parent directory (server root)
dotenv.config({ path: path.join(__dirname, '../.env') });

const DB_CONFIGS = [
    {
        name: "Primary (Export)",
        prodUri: process.env.PROD_MONGODB_URI,
        localUri: process.env.DEV_MONGODB_URI || "mongodb://localhost:27017/export"
    },
    {
        name: "Import (Exim)",
        prodUri: process.env.IMPORT_MONGODB_URI_PROD,
        localUri: process.env.IMPORT_MONGODB_URI_DEV || "mongodb://localhost:27017/exim"
    }
];

async function migrateDb(config) {
    if (!config.prodUri) {
        console.warn(`⚠️ Skipping ${config.name}: Prod URI not found in .env`);
        return;
    }

    console.log(`\n--- Migrating ${config.name} ---`);
    console.log(`Source: ${config.prodUri.replace(/\/\/.*@/, '//****:****@')}`);
    console.log(`Destination: ${config.localUri}`);

    const prodClient = new MongoClient(config.prodUri);
    const localClient = new MongoClient(config.localUri);

    try {
        await prodClient.connect();
        await localClient.connect();

        const prodDb = prodClient.db();
        const localDb = localClient.db();

        const collections = await prodDb.listCollections().toArray();
        console.log(`Found ${collections.length} collections.`);

        for (const colInfo of collections) {
            const colName = colInfo.name;
            if (colName.startsWith('system.')) continue;

            console.log(`📦 Migrating: [${colName}]`);

            const prodCol = prodDb.collection(colName);
            const localCol = localDb.collection(colName);

            const count = await prodCol.countDocuments();
            if (count === 0) {
                console.log(`   - Skipping empty collection.`);
                continue;
            }

            console.log(`   - Clearing local...`);
            await localCol.deleteMany({});

            const batchSize = 1000;
            let migratedCount = 0;
            const cursor = prodCol.find({});
            let batch = [];

            while (await cursor.hasNext()) {
                const doc = await cursor.next();
                batch.push(doc);

                if (batch.length === batchSize) {
                    await localCol.insertMany(batch);
                    migratedCount += batch.length;
                    console.log(`   - Progress: ${migratedCount}/${count}`);
                    batch = [];
                }
            }

            if (batch.length > 0) {
                await localCol.insertMany(batch);
                migratedCount += batch.length;
            }

            console.log(`   ✅ Migrated ${migratedCount} docs.\n`);
        }
    } catch (err) {
        console.error(`❌ Failed migrating ${config.name}:`, err.message);
    } finally {
        await prodClient.close();
        await localClient.close();
    }
}

async function run() {
    console.log("🚀 Starting data migration...");
    
    // Default to migrating all configured databases
    for (const config of DB_CONFIGS) {
        await migrateDb(config);
    }

    console.log("\n✨ All migrations completed!");
}

run();
