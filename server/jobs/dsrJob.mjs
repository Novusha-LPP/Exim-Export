import cron from "node-cron";
import ExportJob from "../model/export/ExJobModel.mjs";
import Directory from "../model/Directorties/Directory.js";
import { generateDSRHTMLTable } from "../utils/dsrReportGenerator.mjs";
import transporter from "../utils/mailer.mjs";

/**
 * Daily 8 PM DSR Job
 * Sends DSR HTML Table to exporters with pending jobs
 */
export const initDsrCronJob = () => {
    // Schedule for 8:00 PM every day (20:00)
    cron.schedule("0 20 * * *", async () => {
        console.log(`[${new Date().toISOString()}] 🕒 Starting Daily DSR Report Job...`);
        try {
            // 1. Get unique exporters with at least one pending job
            // Pending jobs are those that ARE NOT Completed and ARE NOT Cancelled
            const exportersWithPending = await ExportJob.distinct("exporter", {
                $and: [
                    { status: { $nin: ["Completed", "completed", "Cancelled", "cancelled"] } },
                    { isJobCanceled: { $ne: true } },
                    { detailedStatus: { $ne: "Billing Done" } }
                ]
            });

            console.log(`Found ${exportersWithPending.length} exporters with pending jobs.`);

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

                console.log(`Sending DSR to ${emailList.join(", ")} for exporter: ${exporterName}`);

                try {
                    // 4. Generate DSR HTML Table for Pending Jobs ONLY
                    const { html, jobCount } = await generateDSRHTMLTable(exporterName, true);

                    if (jobCount === 0) {
                        console.log(`No pending jobs found for ${exporterName}, skipping email.`);
                        continue;
                    }

                    // 5. Send Mail with HTML DSR table (No Excel Attachment)
                    const dateFormatted = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" });
                    const mailOptions = {
                        from: `"Exim DSR" <${process.env.SMTP_USER || "connect@surajgroupofcompanies.com"}>`,
                        to: emailList.join(", "),
                        subject: `Daily Status Report (DSR) - ${exporterName} - ${dateFormatted}`,
                        html: `
                            <div style="font-family: Arial, sans-serif; font-size: 14px; color: #333333; line-height: 1.5;">
                                <p>Dear Sir/Madam,</p>
                                <p>Please find below the Daily Status Report (DSR) for pending jobs for <strong>${exporterName}</strong>:</p>
                                <div style="margin-top: 15px; margin-bottom: 20px; overflow-x: auto;">
                                    ${html}
                                </div>
                                <p>Best Regards,<br/>
                                <strong>Operations Team</strong><br/>
                                Suraj Forwarders Private Limited</p>
                            </div>
                        `
                    };

                    await transporter.sendMail(mailOptions);
                    console.log(`✅ DSR email sent successfully to ${exporterName} (${jobCount} pending jobs)`);

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
