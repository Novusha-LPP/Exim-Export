import express from "express";
import ExportJob from "../../model/export/ExJobModel.mjs";
import Directory from "../../model/Directorties/Directory.js";
import { generateDSRHTMLTable, generateTableDSRBuffer } from "../../utils/dsrReportGenerator.mjs";
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

    // Compute current Indian financial year (Apr–Mar) as "YY-YY" e.g. "26-27"
    const now = new Date();
    const calYear = now.getFullYear();
    const month = now.getMonth() + 1;
    const fyStartYear = month >= 4 ? calYear : calYear - 1;
    const currentFY = `${String(fyStartYear).slice(-2)}-${String(fyStartYear + 1).slice(-2)}`;

    // 3. Generate HTML DSR Table for Pending Jobs in current FY ONLY
    const { html, jobCount } = await generateDSRHTMLTable(exporterName, true, currentFY);

    if (jobCount === 0) {
        return res.status(200).json({
            success: true,
            message: `No pending jobs found for exporter ${exporterName} in FY ${currentFY}. Email not sent.`
        });
    }

    // 4. Generate Excel Attachment for Pending Jobs in current FY ONLY
    let attachments = [];
    try {
        const excelBuffer = await generateTableDSRBuffer(exporterName, true, currentFY);
        const safeExporterName = exporterName.replace(/[^a-zA-Z0-9_-]/g, "_");
        const dateStr = new Date().toISOString().split("T")[0];
        attachments.push({
            filename: `Table_DSR_${safeExporterName}_${dateStr}.xlsx`,
            content: excelBuffer,
            contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        });
    } catch (attachErr) {
        console.warn(`Could not generate Excel attachment for ${exporterName}:`, attachErr.message);
    }

    // 5. Send Email with Excel attachment
    const dateFormatted = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" });
    const mailOptions = {
        from: `"Exim Test DSR" <${process.env.SMTP_USER || "connect@surajgroupofcompanies.com"}>`,
        to: emailList.join(", "),
        subject: `[TEST] Daily Status Report (DSR) - ${exporterName} - ${dateFormatted}`,
        html: `
            <div style="font-family: Arial, sans-serif; font-size: 14px; color: #333333; line-height: 1.5;">
                <p><strong>[TEST EMAIL]</strong> Dear Sir/Madam,</p>
                <p>Please find attached the Daily Status Report (DSR) for pending jobs for <strong>${exporterName}</strong> as an Excel spreadsheet for your reference.</p>
                <br/>
                <p>Best Regards,<br/>
                <strong>Operations Team</strong><br/>
                Suraj Forwarders Private Limited</p>
            </div>
        `,
        attachments: attachments
    };

    await transporter.sendMail(mailOptions);

    res.json({ 
        success: true, 
        message: `Test DSR email sent successfully to ${emailList.length} addresses (${jobCount} pending jobs included with Excel attachment): ${emailList.join(", ")}`
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
