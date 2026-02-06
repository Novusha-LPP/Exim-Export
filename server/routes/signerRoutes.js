import express from "express";
import mongoose from "mongoose";
import ExJobModel from "../model/export/ExJobModel.mjs";
import { generateShippingBillFlatFile } from "../services/flatFileGenerator.mjs";
// import { uploadToS3 } from "../utils/s3"; // Assuming s3 util exists, or we store locally/base64 for now
// For now, we will just store the signed content path or mock it since S3 util might be different
import multer from "multer";

const router = express.Router();
const upload = multer(); // Memory storage for now

// 1. Start Signing Process
router.post("/start-sign", async (req, res) => {
  try {
    const { jobIds } = req.body;
    if (!jobIds || !Array.isArray(jobIds)) {
      return res.status(400).json({ message: "Invalid jobIds" });
    }

    const result = await ExJobModel.updateMany(
      { _id: { $in: jobIds } },
      { $set: { signingStatus: "ReadyToSign" } }
    );

    res.json({ message: "Jobs marked for signing", count: result.modifiedCount });
  } catch (error) {
    console.error("Error in start-sign:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// 2. Get Jobs Ready to Sign (Called by Local Signer)
router.get("/jobs", async (req, res) => {
  try {
    const jobs = await ExJobModel.find({ signingStatus: "ReadyToSign" })
      .select("job_no sb_no sb_date exporter ieCode gstin custom_house cha_code exporter_address exporter_state exporter_pincode destination_port invoices")
      .lean();

    // Map jobs to include proper ICEGATE Flat File Content
    const jobsWithContent = jobs.map(job => {
      // Use proper flat file generator
      const flatFileContent = generateShippingBillFlatFile(job);
      
      return {
        ...job,
        flatFileContent
      };
    });

    res.json(jobsWithContent);
  } catch (error) {
    console.error("Error fetching signing jobs:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// 3. Upload Signed File (Called by Local Signer)
router.post("/upload", upload.any(), async (req, res) => {
  try {
    // Expecting: jobId, signedFile (pkcs7/signature), and originalFile (.sb)
    const { jobId } = req.body;
    
    // In a real implementation:
    // 1. Upload files to S3
    // 2. Get the S3 URL
    
    // For this POC/Verification, we will mock the S3 upload and just mark as signed.
    /*
    const signedFile = req.files.find(f => f.fieldname === 'signedFile');
    const s3Url = await uploadToS3(signedFile);
    */
    
    // Mock URL
    const mockS3Key = `signatures/${jobId}/${Date.now()}.sb.sig`;

    const job = await ExJobModel.findByIdAndUpdate(
      jobId, 
      { 
        signingStatus: "Signed",
        signedFilePath: mockS3Key, 
        signedDate: new Date()
      },
      { new: true }
    );

    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    res.json({ message: "File uploaded and job marked as Signed", job });
  } catch (error) {
    console.error("Error uploading signed file:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

export default router;
