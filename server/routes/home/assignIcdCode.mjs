import express from "express";
import UserModel from "../../model/userModel.mjs";

const router = express.Router();

// Route to assign ICD codes to a user
router.post("/api/admin/assign-icd-code", async (req, res) => {
  const { username, selectedIcdCodes, adminUsername } = req.body;

  try {
    // Validation
    if (!username || !selectedIcdCodes || !adminUsername) {
      return res.status(400).json({
        message: "Username, selected ICD codes, and admin username are required"
      });
    }

    // Ensure selectedIcdCodes is an array
    const icdCodesArray = Array.isArray(selectedIcdCodes) ? selectedIcdCodes : [selectedIcdCodes];

    // Find the admin user
    const adminUser = await UserModel.findOne({ username: adminUsername });
    if (!adminUser || adminUser.role !== "Admin") {
      return res.status(403).json({
        message: "Unauthorized. Admin privileges required."
      });
    }

    // Find the target user
    const targetUser = await UserModel.findOne({ username });
    if (!targetUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Valid ICD codes
    const validIcdCodes = [
      "ICD SACHANA",
      "ICD SANAND",
      "ICD KHODIYAR",
      "ICD SABARMATI, AHMEDABAD",
      "ICD VIRAMGAM",
      "AIR AHMEDABAD",
      "AHMEDABAD AIR CARGO",
      "THAR DRY PORT",
      "ICD VIROCHANNAGAR",
      "ICD VIROCHAN NAGAR",
      "HAZIRA"
    ];

    // Validate all selected ICD codes
    const invalidCodes = icdCodesArray.filter(code => !validIcdCodes.includes(code));
    if (invalidCodes.length > 0) {
      return res.status(400).json({
        message: `Invalid ICD codes selected: ${invalidCodes.join(', ')}`
      });
    }

    // Update the user's ICD codes (remove duplicates)
    targetUser.selected_icd_codes = [...new Set(icdCodesArray)];
    await targetUser.save();

    res.status(200).json({
      message: `ICD codes "${icdCodesArray.join(', ')}" assigned to user "${username}" successfully`
    });

  } catch (err) {
    console.error("Error assigning ICD codes:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Route to remove ICD codes from a user
router.post("/api/admin/remove-icd-code", async (req, res) => {
  const { username, adminUsername, icdCodesToRemove } = req.body;

  try {
    // Validation
    if (!username || !adminUsername) {
      return res.status(400).json({
        message: "Username and admin username are required"
      });
    }

    // Find the admin user
    const adminUser = await UserModel.findOne({ username: adminUsername });
    if (!adminUser || adminUser.role !== "Admin") {
      return res.status(403).json({
        message: "Unauthorized. Admin privileges required."
      });
    }

    // Find the target user
    const targetUser = await UserModel.findOne({ username });
    if (!targetUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if user has any ICD codes assigned
    if (!targetUser.selected_icd_codes || targetUser.selected_icd_codes.length === 0) {
      return res.status(400).json({
        message: "No ICD codes assigned to this user"
      });
    }

    // If specific codes to remove are provided, remove only those
    if (icdCodesToRemove && Array.isArray(icdCodesToRemove)) {
      targetUser.selected_icd_codes = targetUser.selected_icd_codes.filter(
        code => !icdCodesToRemove.includes(code)
      );
      await targetUser.save();

      res.status(200).json({
        message: `ICD codes "${icdCodesToRemove.join(', ')}" removed from user "${username}" successfully`
      });
    } else {
      // Remove all ICD codes
      targetUser.selected_icd_codes = [];
      await targetUser.save();

      res.status(200).json({
        message: `All ICD codes removed from user "${username}" successfully`
      });
    }

  } catch (err) {
    console.error("Error removing ICD codes:", err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
