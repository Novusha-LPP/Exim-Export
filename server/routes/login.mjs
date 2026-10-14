import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import UserModel from "../model/userModel.mjs";

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("FATAL CONFIG ERROR: Missing JWT_SECRET in environment variables.");
}

const router = express.Router();

router.post("/api/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await UserModel.findOne({ username });
    if (!user) {
      return res.status(400).json({ message: "User not registered" });
    }

    bcrypt.compare(password, user.password, (passwordErr, passwordResult) => {
      if (passwordErr) {
        console.error(passwordErr);
        return res.status(500).json({ message: "Something went wrong" });
      }

      if (passwordResult) {
        // Generate cryptographic JWT token
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

        // Create a new object with only the required fields + the signed token
        const userResponse = {
          _id: user._id,
          username: user.username,
          role: user.role,
          token: token,
          modules: user.modules,
          first_name: user.first_name,
          middle_name: user.middle_name,
          last_name: user.last_name,
          company: user.company,
          employee_photo: user.employee_photo,
          designation: user.designation,
          department: user.department,
          employment_type: user.employment_type,
          email: user.email,
          assigned_importer: user.assigned_importer,
          assigned_importer_name: user.assigned_importer_name,
          selected_icd_codes: user.selected_icd_codes,
          selected_branches: user.selected_branches,
          selected_ports: user.selected_ports,
          canDeleteDocs: user.canDeleteDocs || false,
        };

        return res.status(200).json(userResponse);
      } else {
        return res
          .status(400)
          .json({ message: "Username or password didn't match" });
      }
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Something went wrong" });
  }
});

export default router;
