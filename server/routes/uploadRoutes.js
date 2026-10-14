import express from "express";
import multer from "multer";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import os from "os";
import { fileURLToPath } from "url";

// Helper to get __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. Load from default .env
dotenv.config();
// 2. Load from client/.env as fallback
dotenv.config({ path: path.join(__dirname, "../../client/.env") });

const router = express.Router();

// Temporary directory for streaming file uploads without consuming Node.js heap memory
const tempUploadDir = path.join(os.tmpdir(), "exim-uploads");
if (!fs.existsSync(tempUploadDir)) {
  try {
    fs.mkdirSync(tempUploadDir, { recursive: true });
  } catch (e) {
    // Ignore if directory exists
  }
}

// Enterprise disk storage: streams incoming files directly to disk instead of heap buffer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, tempUploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const cleanExt = path.extname(file.originalname) || "";
    cb(null, `upload-${uniqueSuffix}${cleanExt}`);
  },
});

// Strict MIME type validation to prevent malicious uploads (Stored XSS, executables)
const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "text/csv",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/zip",
  "application/x-zip-compressed",
  "text/plain",
]);

const fileFilter = (req, file, cb) => {
  const mime = (file.mimetype || "").toLowerCase();
  if (ALLOWED_MIME_TYPES.has(mime) || mime.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `Security Error: File type '${file.mimetype}' is not permitted. Only PDF, Excel, Word, CSV, Zip, and Images are allowed.`
      ),
      false
    );
  }
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB limit per file
  fileFilter: fileFilter,
});

// Extract AWS credentials
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
  const files = req.files;

  try {
    const folderName = req.body.folderName || "uploads";

    if (!files || files.length === 0) {
      return res.status(400).send("No files uploaded.");
    }

    if (!bucketName) {
      throw new Error("S3 Bucket name is missing in configuration.");
    }

    // Process files using disk streams to keep RAM heap consumption near zero
    const uploadPromises = files.map(async (file) => {
      const timestamp = Date.now();
      const safeName = file.originalname.replace(/\s+/g, "-");
      const fileExtension = safeName.substring(safeName.lastIndexOf("."));
      const baseFileName = safeName.substring(0, safeName.lastIndexOf("."));
      const uniqueFileName = `${baseFileName}-${timestamp}${fileExtension}`;
      const key = `${folderName}/${uniqueFileName}`;

      const fileStats = fs.statSync(file.path);
      const fileStream = fs.createReadStream(file.path);

      const params = {
        Bucket: bucketName,
        Key: key,
        Body: fileStream,
        ContentType: file.mimetype,
        ContentLength: fileStats.size,
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
  } finally {
    // Automatically purge all temporary disk files after S3 upload
    if (files && Array.isArray(files)) {
      for (const file of files) {
        if (file.path && fs.existsSync(file.path)) {
          try {
            fs.unlinkSync(file.path);
          } catch (unlinkErr) {
            // Ignore cleanup errors
          }
        }
      }
    }
  }
});

export default router;
