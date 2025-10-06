import express from "express";
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";

const router = express.Router();

// Check for required environment variables first
if (
  !process.env.VITE_ACCESS_KEY ||
  !process.env.VITE_SECRET_ACCESS_KEY ||
  !process.env.VITE_AWS_REGION
) {
  throw new Error(
    "Missing AWS credentials or region in environment variables."
  );
}

const s3 = new S3Client({
  region: process.env.VITE_AWS_REGION,
  credentials: {
    accessKeyId: process.env.VITE_ACCESS_KEY,
    secretAccessKey: process.env.VITE_SECRET_ACCESS_KEY,
  },
});

router.post("/api/delete-s3-file", async (req, res) => {
  const rawKey = req.body.key;
  if (!rawKey) {
    return res.status(400).json({ message: "Missing file key" });
  }

  const key = decodeURIComponent(rawKey);

  const command = new DeleteObjectCommand({
    Bucket: process.env.VITE_S3_BUCKET,
    Key: key,
  });

  try {
    await s3.send(command);
    res.status(200).json({ message: "File deleted successfully" });
  } catch (err) {
    console.error("S3 deletion error:", err);
    res.status(500).json({ message: "Error deleting file from S3" });
  }
});

export default router;
