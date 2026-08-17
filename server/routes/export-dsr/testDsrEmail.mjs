import express from "express";
import ExportJob from "../../model/export/ExJobModel.mjs";
import Directory from "../../model/Directorties/Directory.js";
import { generateDSRHTMLTable, generateDSRBuffer } from "../../utils/dsrReportGenerator.mjs";
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

    // 3. Generate HTML DSR Table for Pending Jobs ONLY
    const { html, jobCount } = await generateDSRHTMLTable(exporterName, true);

    if (jobCount === 0) {
        return res.status(200).json({
            success: true,
            message: `No pending jobs found for exporter ${exporterName}. Email not sent.`
        });
    }

    // 4. Generate Excel Attachment for Pending Jobs ONLY
    let attachments = [];
    try {
        const excelBuffer = await generateDSRBuffer(exporterName, true);
        const safeExporterName = exporterName.replace(/[^a-zA-Z0-9_-]/g, "_");
        const dateStr = new Date().toISOString().split("T")[0];
        attachments.push({
            filename: `DSR_Report_${safeExporterName}_${dateStr}.xlsx`,
            content: excelBuffer,
            contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        });
    } catch (attachErr) {
        console.warn(`Could not generate Excel attachment for ${exporterName}:`, attachErr.message);
    }

    // 5. Send Email with HTML DSR table AND Excel attachment
    const dateFormatted = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" });
    const mailOptions = {
        from: `"Exim Test DSR" <${process.env.SMTP_USER || "connect@surajgroupofcompanies.com"}>`,
        to: emailList.join(", "),
        subject: `[TEST] Daily Status Report (DSR) - ${exporterName} - ${dateFormatted}`,
        html: `
            <div style="font-family: Arial, sans-serif; font-size: 14px; color: #333333; line-height: 1.5;">
                <p><strong>[TEST EMAIL]</strong> Dear Sir/Madam,</p>
                <p>Please find below the Daily Status Report (DSR) for pending jobs for <strong>${exporterName}</strong>. The complete report is also attached as an Excel spreadsheet for your reference.</p>
                <div style="margin-top: 15px; margin-bottom: 20px; overflow-x: auto;">
                    ${html}
                </div>
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
