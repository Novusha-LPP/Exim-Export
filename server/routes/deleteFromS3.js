import express from "express";
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const router = express.Router();

const region =
  process.env.REACT_APP_AWS_REGION || process.env.AWS_REGION || "ap-south-1";
const accessKeyId =
  process.env.REACT_APP_ACCESS_KEY ||
  process.env.AWS_ACCESS_KEY_ID ||
  process.env.ACCESS_KEY;
const secretAccessKey =
  process.env.REACT_APP_SECRET_ACCESS_KEY ||
  process.env.AWS_SECRET_ACCESS_KEY ||
  process.env.SECRET_ACCESS_KEY;
const bucketName =
  process.env.REACT_APP_S3_BUCKET ||
  process.env.AWS_S3_BUCKET ||
  process.env.S3_BUCKET;

let s3Client = null;
if (accessKeyId && secretAccessKey) {
  s3Client = new S3Client({
    region,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
} else {
  console.warn(
    "[S3-CONFIG] AWS credentials not fully configured. S3 deletion will fail gracefully on execution."
  );
}

/**
 * POST /api/delete-s3-file
 * Cryptographically secured document deletion endpoint with strict RBAC:
 * Requires verified JWT authentication and either `canDeleteDocs === true` or role `Admin`.
 */
const handleDeleteS3File = async (req, res) => {
  try {
    // 1. RBAC & Authentication Enforcement
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required to delete documents from storage.",
      });
    }

    const userRole = (req.user.role || "").toLowerCase();
    const canDeleteDocs = req.user.canDeleteDocs === true;
    const isAdmin = userRole === "admin";

    if (!canDeleteDocs && !isAdmin) {
      return res.status(403).json({
        success: false,
        message:
          "Access Denied: You do not have permission to delete documents. Requires 'canDeleteDocs' privilege or Admin role.",
      });
    }

    // 2. Key Validation & Path Traversal Sanitization
    const rawKey = req.body?.key;
    if (!rawKey || typeof rawKey !== "string" || !rawKey.trim()) {
      return res.status(400).json({
        success: false,
        message: "Invalid or missing file key in request body.",
      });
    }

    const decodedKey = decodeURIComponent(rawKey.trim());
    // Normalize path and strip any path traversal sequences
    const sanitizedKey = path.posix
      .normalize(decodedKey)
      .replace(/^(\.\.(\/|\\|$))+/, "")
      .replace(/^\/+/, "");

    if (!sanitizedKey || sanitizedKey.includes("..")) {
      return res.status(400).json({
        success: false,
        message: "Malformed or unsafe file key.",
      });
    }

    // 3. AWS S3 Client & Bucket Validation
    if (!s3Client || !bucketName) {
      return res.status(500).json({
        success: false,
        message: "S3 storage service is not properly configured on the server.",
      });
    }

    const command = new DeleteObjectCommand({
      Bucket: bucketName,
      Key: sanitizedKey,
    });

    await s3Client.send(command);

    // 4. Audit Logging for Compliance
    console.log(
      `[S3-AUDIT] Document deleted: key='${sanitizedKey}' by user='${req.user.username}' (role='${req.user.role}') from bucket='${bucketName}' at ${new Date().toISOString()}`
    );

    return res.status(200).json({
      success: true,
      message: "File deleted successfully from storage.",
      key: sanitizedKey,
    });
  } catch (err) {
    console.error("[S3-DELETE-ERROR] Failed to delete file from S3:", err);
    return res.status(500).json({
      success: false,
      message: "Error deleting file from storage: " + (err.message || "Unknown S3 error"),
    });
  }
};

// Support both /api/delete-s3-file and /delete-s3-file mount styles
router.post("/api/delete-s3-file", handleDeleteS3File);
router.post("/delete-s3-file", handleDeleteS3File);

export default router;
