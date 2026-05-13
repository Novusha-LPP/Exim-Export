import express from "express";
import mongoose from "mongoose";
import axios from "axios";
import crypto from "crypto";
import ExJobModel from "../model/export/ExJobModel.mjs";
import { generateSBFlatFile } from "./export-dsr/generateFlatFile.mjs";
import SigningUtility from "../utils/SigningUtility.mjs";
import { uploadToS3 } from "../utils/s3Utils.mjs";
import multer from "multer";

const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');

const router = express.Router();
const upload = multer();

/**
 * 1. GET /status
 * Check if the Java Signing Server is alive.
 */
// Check status of Java signer
router.get("/status", async (req, res) => {
  try {
    const status = await SigningUtility.checkStatus();
    res.json(status);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Initialize DSC via Java Signer
router.post("/init-dsc", async (req, res) => {
  try {
    const { pin } = req.body;
    if (!pin) {
      return res.status(400).json({ error: "PIN is required" });
    }
    const response = await axios.post(`${process.env.SIGNING_SERVER_URL}/login`, { pin });
    res.json(response.data);
  } catch (err) {
    console.error("DSC Init Error:", err.message);
    if (err.response && err.response.data) {
      return res.status(err.response.status).json(err.response.data);
    }
    res.status(500).json({ error: "Failed to connect to Signing Server" });
  }
});

/**
 * 2. POST /sign-now
 * Trigger an immediate signing of a job's flat file.
 * Node.js will call the Java server on the Signing PC.
 */
router.post("/sign-now", async (req, res) => {
  try {
    const { jobId } = req.body;
    if (!jobId) {
      return res.status(400).json({ message: "Job ID is required" });
    }

    const job = await ExJobModel.findById(jobId).lean();
    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    // 1. Generate the ICEGATE Flat File using the accurate generator
    const { content, fileName: generatedName } = generateSBFlatFile(job);
    const fileName = generatedName || `${job.job_no || "JOB"}_${job.sb_no || "SB"}.sb`;

    // ── Pipeline byte-integrity debug logging ──
    const contentBuffer = Buffer.from(content, 'latin1');
    console.log(`[SIGN DEBUG] (a) Generated flat file: ${contentBuffer.length} bytes, SHA-256: ${sha256(contentBuffer)}`);

    // 2. Call Java Signing Server
    console.log(`🔄 Requesting signature for Job: ${job.job_no}`);
    const signedBuffer = await SigningUtility.signFlatFile(contentBuffer, fileName);
    console.log(`[SIGN DEBUG] (b) Signed file returned: ${signedBuffer.length} bytes, SHA-256: ${sha256(signedBuffer)}`);

    // 3. Upload signed file to S3
    const s3Key = `signatures/${jobId}/${Date.now()}_${fileName}`;
    console.log(`[SIGN DEBUG] (c) Uploading to S3: ${signedBuffer.length} bytes, SHA-256: ${sha256(signedBuffer)}`);
    const s3Url = await uploadToS3(signedBuffer, s3Key, "application/octet-stream");

    // 4. Update Job Status in MongoDB
    const updatedJob = await ExJobModel.findByIdAndUpdate(
      jobId,
      {
        signingStatus: "Signed",
        signedFilePath: s3Key,
        signedDate: new Date(),
        detailedStatus: "Signed (Flat-file)"
      },
      { new: true }
    );

    // 5. Send file back for download
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Type', 'application/octet-stream');
    res.send(signedBuffer);

  } catch (error) {
    console.error("❌ Signing Error:", error.message);
    res.status(500).json({ message: "Signing Failed", error: error.message });
  }
});

/**
 * 3. POST /sign-esanchit
 * Download a PDF from a given URL, sign it, and return the signed version.
 */
router.post("/sign-esanchit", async (req, res) => {
  try {
    const { jobId, fileUrl, fileName } = req.body;
    if (!fileUrl) {
      return res.status(400).json({ message: "File URL is required" });
    }

    // 1. Download the PDF from the URL (likely S3)
    console.log(`🔄 Downloading e-Sanchit PDF: ${fileUrl}`);
    const pdfResponse = await axios.get(fileUrl, { responseType: 'arraybuffer' });
    const pdfBuffer = Buffer.from(pdfResponse.data);

    // 2. Call Java Signing Server for PDF
    const targetFileName = fileName || "esanchit_signed.pdf";
    const signedBuffer = await SigningUtility.signPdf(pdfBuffer, targetFileName);

    // 3. Optionally upload to S3 (audit trail)
    const s3Key = `signatures/${jobId || 'misc'}/${Date.now()}_${targetFileName}`;
    await uploadToS3(signedBuffer, s3Key, "application/pdf");

    if (jobId) {
      await ExJobModel.findByIdAndUpdate(jobId, {
        detailedStatus: `Signed (${targetFileName})`
      });
    }

    // 4. Return signed file for download
    res.setHeader('Content-Disposition', `attachment; filename="${targetFileName}"`);
    res.setHeader('Content-Type', 'application/pdf');
    res.send(signedBuffer);

  } catch (error) {
    console.error("❌ e-Sanchit Signing Error:", error.message);
    res.status(500).json({ message: "Signing Failed", error: error.message });
  }
});

/**
 * 3. Legacy/Compatibility Endpoints
 */

// Start Signing Process (Manual toggle)
router.post("/start-sign", async (req, res) => {
  try {
    const { jobIds } = req.body;
    const result = await ExJobModel.updateMany(
      { _id: { $in: jobIds } },
      { $set: { signingStatus: "ReadyToSign" } }
    );
    res.json({ message: "Jobs marked for signing", count: result.modifiedCount });
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// Get Jobs Ready to Sign (For polling-based signers)
router.get("/jobs", async (req, res) => {
  try {
    const jobs = await ExJobModel.find({ signingStatus: "ReadyToSign" }).lean();
    const jobsWithContent = jobs.map(job => {
      const { content } = generateSBFlatFile(job);
      return {
        ...job,
        flatFileContent: content
      };
    });
    res.json(jobsWithContent);
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error" });
  }
});

export default router;
