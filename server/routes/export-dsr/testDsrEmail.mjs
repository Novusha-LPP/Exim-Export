import express from "express";
import ExportJob from "../../model/export/ExJobModel.mjs";
import Directory from "../../model/Directorties/Directory.js";
import { generateDSRBuffer } from "../../utils/dsrReportGenerator.mjs";
import transporter from "../../utils/mailer.mjs";

const router = express.Router();

/**
 * POST /api/export-dsr/test-dsr-email
 * Triggers DSR email manually for testing
 */
router.post("/api/export-dsr/test-dsr-email", async (req, res) => {
  try {
    const { exporterName } = req.body;

    if (!exporterName) {
      return res.status(400).json({ success: false, message: "Exporter name is required" });
    }

    // 1. Find directory to get emails
    const escapedName = String(exporterName).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const directory = await Directory.findOne({ 
        organization: { $regex: `^${escapedName}$`, $options: "i" } 
    });

    if (!directory) {
        return res.status(404).json({ success: false, message: `No directory record found for ${exporterName}` });
    }

    // 2. Collect emails
    const emailSet = new Set();
    if (directory.branchInfo) {
        directory.branchInfo.forEach(b => {
            if (b.email) b.email.split(",").forEach(e => {
                const trimE = e.trim();
                if (trimE) emailSet.add(trimE);
            });
        });
    }
    if (directory.authorizedSignatory) {
        directory.authorizedSignatory.forEach(s => {
            if (s.email) s.email.split(",").forEach(e => {
                const trimE = e.trim();
                if (trimE) emailSet.add(trimE);
            });
        });
    }

    const emailList = Array.from(emailSet);
    if (emailList.length === 0) {
        return res.status(400).json({ success: false, message: `No email addresses found for ${exporterName}` });
    }

    // 3. Generate Report (Both Pending + Completed)
    const buffer = await generateDSRBuffer(exporterName, false);

    // 4. Send Email
    const mailOptions = {
        from: `"Exim Test DSR" <${process.env.SMTP_USER || "connect@surajgroupofcompanies.com"}>`,
        to: emailList.join(", "),
        subject: `[TEST] Daily Status Report (DSR) - ${exporterName}`,
        text: `This is a manually triggered TEST email for the Daily Status Report (DSR) feature.\n\nIncluded: Pending + Completed jobs.\n\nSent to: ${emailList.join(", ")}`,
        attachments: [
            {
                filename: `TEST_DSR_Report_${exporterName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`,
                content: buffer
            }
        ]
    };

    await transporter.sendMail(mailOptions);

    res.json({ 
        success: true, 
        message: `Test DSR email sent successfully to ${emailList.length} addresses: ${emailList.join(", ")}`
    });

  } catch (error) {
    console.error("Error in test-dsr-email:", error);
    res.status(500).json({ 
        success: false, 
        message: "Failed to send test email",
        error: error.message 
    });
  }
});

export default router;
