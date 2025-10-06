import express from "express";
import bcrypt from "bcryptjs";
import UserModel from "../../model/userModel.mjs";

const router = express.Router();

router.post("/api/change-password", async (req, res) => {
  const { username, current_password, new_password } = req.body;

  try {
    // Retrieve the user by username
    const user = await UserModel.findOne({ username });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Compare the provided current password with the stored hashed password
    const isMatch = await bcrypt.compare(current_password, user.password);
    if (!isMatch) {
      return res.status(200).json({ message: "Current password is incorrect" });
    }

    // Hash the new password
    const saltRounds = 10;
    const hashedNewPassword = await bcrypt.hash(new_password, saltRounds);

    // Update the user's password in the database
    user.password = hashedNewPassword;
    await user.save();

    // Send a success response
    res.status(200).json({ message: "Password changed successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/api/admin/change-password", async (req, res) => {
  const { username, newPassword, adminUsername } = req.body;

  try {
    // Find the admin user
    const adminUser = await UserModel.findOne({ username: adminUsername });
    if (!adminUser || adminUser.role !== "Admin") {
      return res.status(403).json({ message: "Unauthorized. Admin privileges required." });
    }

    // Find the target user
    const targetUser = await UserModel.findOne({ username });
    if (!targetUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if both are admins and not the same person
    if (targetUser.role === "Admin" && adminUser.username !== targetUser.username) {
      return res.status(403).json({ message: "Admin cannot change another admin's password" });
    }

    // Hash the new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    targetUser.password = hashedNewPassword;
    await targetUser.save();

    // Send success response first
    res.status(200).json({ message: "Password changed successfully" });

    // Send email notification in background
    if (targetUser.email) {
      try {
        const mailOptions = {
          from: "connect@surajgroupofcompanies.com",
          to: targetUser.email,
          subject: "Your Password Has Been Changed",
          html: `
            Dear ${targetUser.first_name || targetUser.username},<br/><br/>
            Your account password has been reset by ${adminUser.first_name || adminUser.username}.<br/><br/>
            Your new login credentials are:<br/>
            <ul>
              <li>Username: ${targetUser.username}</li>
              <li>Password: ${newPassword}</li>
              <li>URL: ${CLIENT_URI}</li>
            </ul>
            Please login and change your password after logging in.<br/><br/>
            Thank you,<br/>
            Admin Team<br/>
            Suraj Forwarders Private Limited<br/><br/>
            <img src="https://alvision-images.s3.ap-south-1.amazonaws.com/Shalini+Mam.jpg" alt="Email Signature" style="max-width:100%; height: auto;">
          `,
        };

        await transporter.sendMail(mailOptions);
      } catch (emailErr) {
        console.error("Failed to send password change email:", emailErr.message);
        // Do not throw, since password has already been changed
      }
    } else {
      console.warn("No email available for user:", targetUser.username);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
