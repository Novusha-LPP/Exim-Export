import express from "express";
import nodemailer from "nodemailer";
import { SESClient, SendRawEmailCommand } from "@aws-sdk/client-ses";
import dotenv from "dotenv";

dotenv.config();

const router = express.Router();

// Create AWS SES client
const sesClient = new SESClient({
  region: "ap-south-1",
  credentials: {
    accessKeyId: import.meta.env.VITE_ACCESS_KEY,
    secretAccessKey: import.meta.env.VITE_SECRET_ACCESS_KEY,
  },
});

// Custom SES transporter
const sesTransport = {
  name: "SES",
  version: "1.0.0",
  send: async (mail, callback) => {
    const mailChunks = [];
    const mailStream = mail.message.createReadStream();

    mailStream.on("data", (chunk) => mailChunks.push(chunk));
    mailStream.on("end", async () => {
      const rawMessage = Buffer.concat(mailChunks).toString("base64");

      const params = {
        RawMessage: { Data: rawMessage },
        Source: mail.data.from,
        Destinations: Array.isArray(mail.data.to)
          ? mail.data.to
          : [mail.data.to],
      };

      try {
        const command = new SendRawEmailCommand(params);
        const data = await sesClient.send(command);
        callback(null, { messageId: data.MessageId });
      } catch (error) {
        callback(error);
      }
    });
  },
};

// Create Nodemailer transporter
let transporter = nodemailer.createTransport(sesTransport);

router.get("/api/send-mail", async (req, res) => {
  try {
    let mailOptions = {
      from: "connect@surajgroupofcompanies.com",
      to: "connect@surajgroupofcompanies.com",
      subject: "Hello from Node.js using AWS SES",
      text: "Hello world?",
      html: "<b>Hello world?</b>",
    };

    let info = await transporter.sendMail(mailOptions);

    console.log("Message sent: %s", info.messageId);
    res.status(200).send("Email sent successfully");
  } catch (error) {
    console.error("Error sending email:", error);
    res.status(500).send("Failed to send email");
  }
});

export default router;
