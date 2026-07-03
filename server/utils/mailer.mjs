import nodemailer from "nodemailer";
import { SESClient, SendRawEmailCommand } from "@aws-sdk/client-ses";
import dotenv from "dotenv";

dotenv.config();

let transporter;

if (process.env.SMTP_HOST) {
  // Create Nodemailer SMTP transporter
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || "587", 10),
    secure: process.env.SMTP_SECURE === "true", // true for 465, false for 587
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
} else {
  // Configure AWS SES
  const sesClient = new SESClient({
    region: process.env.REACT_APP_AWS_REGION || "ap-south-1",
    credentials: {
      accessKeyId: process.env.REACT_APP_ACCESS_KEY,
      secretAccessKey: process.env.REACT_APP_SECRET_ACCESS_KEY,
    },
  });

  // Create Nodemailer SES transporter
  transporter = nodemailer.createTransport({
    SES: { ses: sesClient, aws: { SendRawEmailCommand } },
  });
}

export default transporter;
