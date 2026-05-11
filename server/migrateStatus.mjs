import mongoose from "mongoose";
import dotenv from "dotenv";
import ExJobModel from "./model/export/ExJobModel.mjs";

dotenv.config();

mongoose.connect(process.env.MONGODB_URI || "mongodb+srv://exim:I9y5bcMUHkGHpgq2@exim.xya3qh0.mongodb.net/export", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(async () => {
    console.log("Connected to MongoDB");

    const cursor = ExJobModel.collection.find({});
    let count = 0;

    while (await cursor.hasNext()) {
        const doc = await cursor.next();
        if (Array.isArray(doc.detailedStatus)) {
            const newStatus = doc.detailedStatus.length > 0
                ? String(doc.detailedStatus[doc.detailedStatus.length - 1])
                : "";

            await ExJobModel.collection.updateOne(
                { _id: doc._id },
                { $set: { detailedStatus: newStatus } }
            );
            count++;
        }
    }

    console.log(`Successfully migrated ${count} export jobs.`);
    mongoose.disconnect();
}).catch(err => {
    console.error(err);
});
