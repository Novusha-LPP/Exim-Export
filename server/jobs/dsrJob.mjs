import cron from "node-cron";
import ExportJob from "../model/export/ExJobModel.mjs";
import Directory from "../model/Directorties/Directory.js";
import { generateDSRHTMLTable, generateTableDSRBuffer } from "../utils/dsrReportGenerator.mjs";
import transporter from "../utils/mailer.mjs";

/**
 * Daily 4 PM DSR Job
 * Sends DSR HTML Table and Table DSR Excel Attachment to exporters with pending jobs
 */
export const initDsrCronJob = () => {
    // Schedule for 4:00 PM every day (16:00)
    cron.schedule("0 16 * * *", async () => {
        console.log(`[${new Date().toISOString()}] 🕒 Starting Daily DSR Report Job...`);
        try {
            // Compute current Indian financial year (Apr–Mar) as "YY-YY" e.g. "26-27"
            const now = new Date();
            const calYear = now.getFullYear();
            const month = now.getMonth() + 1;
            const fyStartYear = month >= 4 ? calYear : calYear - 1;
            const currentFY = `${String(fyStartYear).slice(-2)}-${String(fyStartYear + 1).slice(-2)}`;

            // 1. Get unique exporters with at least one pending job in current financial year
            const exportersWithPending = await ExportJob.distinct("exporter", {
                $and: [
                    { year: currentFY },
                    { status: { $nin: ["Completed", "completed", "Cancelled", "cancelled"] } },
                    { isJobCanceled: { $ne: true } },
                    { detailedStatus: { $ne: "Billing Done" } }
                ]
            });

            console.log(`Found ${exportersWithPending.length} exporters with pending jobs for FY ${currentFY}.`);

            for (const exporterName of exportersWithPending) {
                if (!exporterName) continue;

                // 2. Find directory entry for this exporter to get email addresses
                const directory = await Directory.findOne({ 
                    organization: { $regex: `^${exporterName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: "i" } 
                });

                if (!directory) {
                    console.warn(`No directory found for exporter: ${exporterName}`);
                    continue;
                }

                // 3. Collect all unique email addresses from all branches and authorized signatories
                const emailSet = new Set();
                
                // From branchInfo
                if (directory.branchInfo && directory.branchInfo.length > 0) {
                    directory.branchInfo.forEach(branch => {
                        if (branch.email) {
                            // Extract multiple emails if comma separated
                            branch.email.split(",").forEach(e => {
                                const trimEmail = e.trim();
                                if (trimEmail) emailSet.add(trimEmail);
                            });
                        }
                    });
                }
                
                // From authorizedSignatory
                if (directory.authorizedSignatory && directory.authorizedSignatory.length > 0) {
                    directory.authorizedSignatory.forEach(sig => {
                        if (sig.email) {
                            sig.email.split(",").forEach(e => {
                                const trimEmail = e.trim();
                                if (trimEmail) emailSet.add(trimEmail);
                            });
                        }
                    });
                }

                const emailList = Array.from(emailSet);

                if (emailList.length === 0) {
                    console.warn(`No email addresses found in directory for exporter: ${exporterName}`);
                    continue;
                }

                console.log(`Sending DSR (${currentFY}) to ${emailList.join(", ")} for exporter: ${exporterName}`);

                try {
                    // 4. Check for Pending Jobs in current FY ONLY
                    const { html, jobCount } = await generateDSRHTMLTable(exporterName, true, currentFY);

                    if (jobCount === 0) {
                        console.log(`No pending jobs found for ${exporterName} in FY ${currentFY}, skipping email.`);
                        continue;
                    }

                    // 5. Generate Excel Attachment for Pending Jobs in current FY ONLY
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

                    // 6. Send Mail with Excel attachment
                    const dateFormatted = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" });
                    const mailOptions = {
                        from: `"Exim DSR" <${process.env.SMTP_USER || "connect@surajgroupofcompanies.com"}>`,
                        to: emailList.join(", "),
                        subject: `Daily Status Report (DSR) - ${exporterName} - ${dateFormatted}`,
                        html: `
                            <div style="font-family: Arial, sans-serif; font-size: 14px; color: #333333; line-height: 1.5;">
                                <p>Dear Sir/Madam,</p>
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
                    console.log(`✅ DSR email with Excel attachment sent successfully to ${exporterName} (${jobCount} pending jobs)`);

                } catch (reportError) {
                    console.error(`❌ Error generating/sending DSR for ${exporterName}:`, reportError);
                }
            }

            console.log(`[${new Date().toISOString()}] ✅ Daily DSR Job completed.`);
        } catch (error) {
            console.error("❌ Critical error in DSR cron job:", error);
        }
    }, {
        timezone: "Asia/Kolkata" // Set to Indian Standard Time
    });
};
