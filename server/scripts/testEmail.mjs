import sendMsg91Email from "../utils/msg91Email.mjs";
import dotenv from "dotenv";

dotenv.config();

const recipientEmail = process.argv[2] || "daymarafik123@gmail.com";
const templateId = process.argv[3] || process.env.MSG91_TEMPLATE_ID;

async function run() {
  console.log(`🚀 Sending MSG91 test email to: ${recipientEmail}`);
  console.log(`🔑 AuthKey: ${process.env.MSG91_AUTHKEY}`);
  console.log(`🌐 Domain: ${process.env.MSG91_DOMAIN}`);
  console.log(`📝 Template ID: ${templateId || "(Not specified)"}`);

  if (!templateId) {
    console.error("\n⚠️ Error: MSG91 requires a valid Template ID created in your MSG91 control panel.");
    console.error("Usage: node scripts/testEmail.mjs <recipient_email> <template_id>");
    process.exit(1);
  }

  try {
    const response = await sendMsg91Email({
      templateId,
      recipients: [
        {
          to: [{ email: recipientEmail, name: "Recipient" }],
        },
      ],
    });
    console.log("✅ Email sent successfully:", response);
  } catch (error) {
    console.error("❌ Email sending failed:", error.message);
  }
}

run();
