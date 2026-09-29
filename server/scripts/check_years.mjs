import mongoose from "mongoose";

async function testUri(uri) {
  try {
    const conn = await mongoose.createConnection(uri, { serverSelectionTimeoutMS: 2000 }).asPromise();
    const cols = await conn.db.listCollections().toArray();
    console.log(`URI: ${uri}`);
    console.log("Collections:", cols.map(c => c.name));
    for (const c of cols) {
      if (c.name.includes("job") || c.name.includes("export")) {
        const count = await conn.db.collection(c.name).countDocuments();
        console.log(`  Count in ${c.name}: ${count}`);
        const years = await conn.db.collection(c.name).distinct("year");
        console.log(`  Years in ${c.name}:`, years);
      }
    }
    await conn.close();
  } catch (e) {
    console.log(`Error connecting to ${uri}:`, e.message);
  }
}

async function run() {
  await testUri("mongodb://localhost:27017/export");
  await testUri("mongodb://localhost:27017/exim");
  await testUri("mongodb+srv://exim:I9y5bcMUHkGHpgq2@exim.xya3qh0.mongodb.net/exim");
}

run();
