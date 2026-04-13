import express from "express";
import mongoose from "mongoose";
import ApiKeyModel from "../../model/apiKeyModel.mjs";
import UserModel from "../../model/userModel.mjs";
import { requireAdmin } from "../../middleware/adminAuth.mjs";
import crypto from "crypto";

const router = express.Router();

/**
 * @api {get} /api/admin/api-keys List all API keys (Admin only)
 */
router.get("/api/admin/api-keys", requireAdmin, async (req, res) => {
  try {
    // Return all keys (Admin only can access this route)
    let keys = await ApiKeyModel.find().lean();

    // Manual population for both legacy usernames and new ObjectIds
    for (let i = 0; i < keys.length; i++) {
        const creatorIdOrName = keys[i].createdBy;
        if (!creatorIdOrName) {
            keys[i].createdBy = { username: "System" };
            continue;
        }

        let user = null;
        // Check if it's a valid MongoDB ObjectId
        if (mongoose.Types.ObjectId.isValid(creatorIdOrName)) {
            user = await UserModel.findById(creatorIdOrName, "first_name last_name username").lean();
        } 
        
        // If not found by ID, or it was a string username, try finding by username
        if (!user && typeof creatorIdOrName === 'string') {
            user = await UserModel.findOne({ username: creatorIdOrName }, "first_name last_name username").lean();
        }

        if (user) {
            keys[i].createdBy = user;
        } else {
            // Fallback for display if user is totally missing
            keys[i].createdBy = { username: typeof creatorIdOrName === 'string' ? creatorIdOrName : "Unknown" };
        }
    }

    res.status(200).json(keys);
  } catch (error) {
    console.error("Error listing API keys:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * @api {post} /api/admin/api-keys Create a new API key (Admin only)
 */
router.post("/api/admin/api-keys", requireAdmin, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
        return res.status(400).json({ error: "Name is required for the API Key." });
    }

    // Generate a secure random 64-character hex string (32 bytes)
    const key = crypto.randomBytes(32).toString("hex");
    
    const newApiKey = new ApiKeyModel({
      key,
      name,
      createdBy: req.verifiedUser._id // Using verifiedUser from requireAdmin middleware
    });

    await newApiKey.save();

    // Return the full key ONLY ONCE upon creation
    res.status(201).json({ 
        message: "API Key created successfully. Please store it securely.",
        name: newApiKey.name,
        key: key 
    });
  } catch (error) {
    console.error("Error creating API key:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.patch("/api/admin/api-keys/:id/toggle", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Using findByIdAndUpdate with a toggle toggle ($not) works without loading the model, 
    // which bypasses validation errors on internal fields like 'createdBy' (legacy strings)
    const updatedKey = await ApiKeyModel.findByIdAndUpdate(
        id,
        [
            { $set: { isActive: { $cond: { if: { $eq: ["$isActive", false] }, then: true, else: false } } } }
        ],
        { new: true }
    );

    if (!updatedKey) {
      return res.status(404).json({ error: "API Key not found." });
    }

    res.status(200).json({ 
        message: `API Key ${updatedKey.isActive ? "activated" : "deactivated"} successfully.`,
        isActive: updatedKey.isActive
    });
  } catch (error) {
    console.error("Error toggling API key status:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
