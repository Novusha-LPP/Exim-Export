import express from "express";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import UserModel from "../model/userModel.mjs";

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;

const router = express.Router();

router.get("/api/get-user/:username", async (req, res) => {
  const { username } = req.params;

  try {
    const user = await UserModel.findOne({ username });

    if (!user) {
      return res.status(200).json({ message: "User not found" });
    }

    const userObj = user.toObject ? user.toObject() : { ...user };
    delete userObj.password;

    // Attach freshly signed cryptographic token if secret is present
    if (JWT_SECRET) {
      const token = jwt.sign(
        {
          _id: user._id,
          username: user.username,
          role: user.role,
          modules: user.modules || [],
          canDeleteDocs: user.canDeleteDocs || false,
          selected_branches: user.selected_branches || [],
          selected_ports: user.selected_ports || [],
        },
        JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRATION || "7d" }
      );
      userObj.token = token;
    }

    res.status(200).json(userObj);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Something went wrong" });
  }
});

export default router;
