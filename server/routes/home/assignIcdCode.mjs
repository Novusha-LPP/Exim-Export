import express from "express";
import UserModel from "../../model/userModel.mjs";

const router = express.Router();

// Route to Assign Branch, branches, and ports to a user
router.post("/api/admin/assign-icd-code", async (req, res) => {
  const { username, selectedIcdCodes, selectedBranches, selectedPorts, adminUsername } = req.body;

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

    // Valid ICD codes/Ports
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

    // Valid Branches
    const validBranches = ["AMD", "BRD", "GIM", "HAZ", "COK"];

    // Update ICD codes if provided
    if (selectedIcdCodes) {
      const icdCodesArray = Array.isArray(selectedIcdCodes) ? selectedIcdCodes : [selectedIcdCodes];
      const invalidIcd = icdCodesArray.filter(code => !validIcdCodes.includes(code));
      if (invalidIcd.length > 0) {
        return res.status(400).json({ message: `Invalid ICD codes: ${invalidIcd.join(', ')}` });
      }
      targetUser.selected_icd_codes = [...new Set(icdCodesArray)];
    }

    // Update Branches if provided
    if (selectedBranches) {
      const branchesArray = Array.isArray(selectedBranches) ? selectedBranches : [selectedBranches];
      const invalidBranches = branchesArray.filter(b => !validBranches.includes(b));
      if (invalidBranches.length > 0) {
        return res.status(400).json({ message: `Invalid Branches: ${invalidBranches.join(', ')}` });
      }
      targetUser.selected_branches = [...new Set(branchesArray)];
    }

    // Update Ports if provided (treating same as ICD for now or separately if needed)
    if (selectedPorts) {
      const portsArray = Array.isArray(selectedPorts) ? selectedPorts : [selectedPorts];
      // You can add port validation here if needed
      targetUser.selected_ports = [...new Set(portsArray)];
    }

    await targetUser.save();

    res.status(200).json({
      message: `Assignments updated successfully for user "${username}"`
    });

  } catch (err) {
    console.error("Error assigning branch/ports:", err);
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
    }

    // Add removal logic for branches and ports if needed
    const { branchesToRemove, portsToRemove } = req.body;
    if (branchesToRemove && Array.isArray(branchesToRemove)) {
      targetUser.selected_branches = targetUser.selected_branches.filter(
        b => !branchesToRemove.includes(b)
      );
    }
    if (portsToRemove && Array.isArray(portsToRemove)) {
      targetUser.selected_ports = targetUser.selected_ports.filter(
        p => !portsToRemove.includes(p)
      );
    }

    // If no specific removals provided, and it's a "remove all" call (implied by lack of specific fields)
    if (!icdCodesToRemove && !branchesToRemove && !portsToRemove) {
      targetUser.selected_icd_codes = [];
      targetUser.selected_branches = [];
      targetUser.selected_ports = [];
    }

    await targetUser.save();

    res.status(200).json({
      message: `Assignments removed from user "${username}" successfully`
    });

  } catch (err) {
    console.error("Error removing ICD codes:", err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
