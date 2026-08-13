import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import UserModel from "../model/userModel.mjs";

dotenv.config();

const allModules = [
  "Export - ESanchit",
  "Export - Documentation",
  "Export - Jobs",
  "Export - VGM",
  "Export - Audit Trail",
  "Export - Operation",
  "Export - Charges",
  "Export - Billing",
  "Freight Forwarding",
  "Directories",
  "Open Points",
  "Export - Reports",
  "Pulse"
];

async function createDummyClient() {
  try {
    const username = "novusha_demo";
    const rawPassword = "Novusha@2026";
    const hashedPassword = bcrypt.hashSync(rawPassword, 10);

    let user = await UserModel.findOne({ username });

    if (user) {
      user.password = hashedPassword;
      user.role = "User";
      user.first_name = "Novusha";
      user.last_name = "Client Demo";
      user.company = "Novusha Client Demo";
      user.email = "demo@novusha.com";
      user.modules = allModules;
      await user.save();
      console.log(`✅ Existing user '${username}' updated successfully with all modules!`);
    } else {
      user = new UserModel({
        username,
        password: hashedPassword,
        role: "User",
        first_name: "Novusha",
        last_name: "Client Demo",
        company: "Novusha Client Demo",
        email: "demo@novusha.com",
        modules: allModules,
      });
      await user.save();
      console.log(`✅ Dummy client user '${username}' created successfully with all modules!`);
    }

    console.log("\n==========================================");
    console.log("🔑 DUMMY CLIENT DEMO CREDENTIALS FOR NOVUSHA:");
    console.log(`   Username: ${username}`);
    console.log(`   Password: ${rawPassword}`);
    console.log("==========================================\n");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error creating dummy client user:", error);
    process.exit(1);
  }
}

createDummyClient();
