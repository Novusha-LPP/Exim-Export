import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import dotenv from "dotenv";

dotenv.config();

const region = process.env.REACT_APP_AWS_REGION || process.env.AWS_REGION || "ap-south-1";
const accessKeyId = process.env.REACT_APP_ACCESS_KEY || process.env.ACCESS_KEY;
const secretAccessKey = process.env.REACT_APP_SECRET_ACCESS_KEY || process.env.SECRET_ACCESS_KEY;
const bucketName = process.env.REACT_APP_S3_BUCKET || process.env.S3_BUCKET;

const s3Client = new S3Client({
  region,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
});

/**
 * Upload a buffer to S3.
 * @param {Buffer} buffer - File content.
 * @param {string} key - S3 Key (path).
 * @param {string} contentType - Mime type.
 * @returns {Promise<string>} - S3 URL.
 */
export async function uploadToS3(buffer, key, contentType = "application/octet-stream") {
  if (!bucketName) {
    throw new Error("S3 Bucket name is missing in configuration.");
  }

  const params = {
    Bucket: bucketName,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  };

  const command = new PutObjectCommand(params);
  await s3Client.send(command);

  return `https://${bucketName}.s3.${region}.amazonaws.com/${key}`;
}

export default {
  uploadToS3,
};
