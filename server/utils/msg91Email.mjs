import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const MSG91_EMAIL_API_URL = "https://control.msg91.com/api/v5/email/send";

/**
 * Send email using MSG91 Email API v5
 * 
 * @param {Object} options
 * @param {string} options.templateId - MSG91 Email Template ID
 * @param {Array<{to: Array<{email: string, name?: string}>, variables?: Record<string, any>}>} options.recipients - Recipients list with optional variables per recipient
 * @param {string} [options.fromEmail] - Sender email address (defaults to process.env.MSG91_FROM_EMAIL)
 * @param {string} [options.fromName] - Sender name (optional)
 * @param {string} [options.domain] - Registered domain (defaults to process.env.MSG91_DOMAIN)
 * @param {string} [options.authKey] - MSG91 Auth Key (defaults to process.env.MSG91_AUTHKEY)
 * @param {Array<Object>} [options.attachments] - Optional attachments
 * @returns {Promise<Object>} API response data from MSG91
 */
export async function sendMsg91Email({
  templateId,
  recipients,
  fromEmail,
  fromName,
  domain,
  authKey,
  attachments,
}) {
  const finalAuthKey = authKey || process.env.MSG91_AUTHKEY;
  const finalDomain = domain || process.env.MSG91_DOMAIN;
  const finalFromEmail = fromEmail || process.env.MSG91_FROM_EMAIL || `no-reply@${finalDomain}`;

  if (!finalAuthKey) {
    throw new Error("MSG91 Auth Key is missing. Set MSG91_AUTHKEY in process.env or pass authKey.");
  }
  if (!templateId) {
    throw new Error("MSG91 Template ID is required.");
  }
  if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
    throw new Error("Recipients list cannot be empty.");
  }

  const payload = {
    recipients,
    from: {
      email: finalFromEmail,
      ...(fromName ? { name: fromName } : {}),
    },
    domain: finalDomain,
    template_id: templateId,
  };

  if (attachments && Array.isArray(attachments) && attachments.length > 0) {
    payload.attachments = attachments;
  }

  try {
    const response = await axios.post(MSG91_EMAIL_API_URL, payload, {
      headers: {
        "Content-Type": "application/json",
        authkey: finalAuthKey,
      },
    });

    console.log("✅ MSG91 Email sent successfully:", response.data);
    return response.data;
  } catch (error) {
    const errorDetails = error.response?.data || error.message;
    console.error("❌ Failed to send MSG91 email:", errorDetails);
    throw new Error(`MSG91 Email API error: ${JSON.stringify(errorDetails)}`);
  }
}

export default sendMsg91Email;
