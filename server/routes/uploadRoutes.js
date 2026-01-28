import express from "express";
import multer from "multer";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Helper to get __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load logs to help debug


// 1. Load from default .env
dotenv.config();
// 2. Load from client/.env as fallback
dotenv.config({ path: path.join(__dirname, "../../client/.env") });

const router = express.Router();
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Extract variables
const region =
  process.env.REACT_APP_AWS_REGION || process.env.AWS_REGION || "ap-south-1";
const accessKeyId = process.env.REACT_APP_ACCESS_KEY || process.env.ACCESS_KEY;
const secretAccessKey =
  process.env.REACT_APP_SECRET_ACCESS_KEY || process.env.SECRET_ACCESS_KEY;
const bucketName = process.env.REACT_APP_S3_BUCKET || process.env.S3_BUCKET;



const s3Client = new S3Client({
  region: region,
  credentials: {
    accessKeyId: accessKeyId,
    secretAccessKey: secretAccessKey,
  },
});

router.post("/upload", upload.array("files"), async (req, res) => {
  try {
    const files = req.files;
    const folderName = req.body.folderName || "uploads";

    if (!files || files.length === 0) {
      return res.status(400).send("No files uploaded.");
    }

    if (!bucketName) {
      throw new Error("S3 Bucket name is missing in configuration.");
    }

    const uploadPromises = files.map(async (file) => {
      const timestamp = Date.now();
      const safeName = file.originalname.replace(/\s+/g, "-");
      const fileExtension = safeName.substring(safeName.lastIndexOf("."));
      const baseFileName = safeName.substring(0, safeName.lastIndexOf("."));
      const uniqueFileName = `${baseFileName}-${timestamp}${fileExtension}`;
      const key = `${folderName}/${uniqueFileName}`;

      const params = {
        Bucket: bucketName,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      };

      const command = new PutObjectCommand(params);
      await s3Client.send(command);

      return `https://${bucketName}.s3.${region}.amazonaws.com/${key}`;
    });

    const locations = await Promise.all(uploadPromises);
    res.json({ locations });
  } catch (error) {
    console.error("Upload Error:", error);
    res.status(500).send("Error uploading files: " + error.message);
  }
});

export default router;
