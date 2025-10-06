import { createLogger, format, transports } from "winston";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import "winston-mongodb";
import dotenv from "dotenv";
dotenv.config();

const MONGODB_URI =
  process.env.NODE_ENV === "production"
    ? process.env.PROD_MONGODB_URI
    : process.env.NODE_ENV === "server"
    ? process.env.SERVER_MONGODB_URI
    : process.env.DEV_MONGODB_URI;

// Convert the URL to a file path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure log directory exists
const logDirectory = path.join(__dirname, "logs");
fs.existsSync(logDirectory) || fs.mkdirSync(logDirectory);

// Custom formatting function including numbering
let logCounter = 0; // Initialize the counter
const customFormat = format.printf(({ level, message, stack, timestamp }) => {
  return `${timestamp} [${level}] ${++logCounter}: ${message}${
    stack ? "\nStack Trace:\n" + stack : ""
  }`;
});

// Define base format
const baseFormat = format.combine(
  format.timestamp({
    format: "YYYY-MM-DD HH:mm:ss",
  }),
  format.errors({ stack: true }),
  customFormat
);

// Create the logger
const logger = createLogger({
  level: "error", // Log only errors and more severe messages
  format: baseFormat,
  transports: [
    new transports.File({
      filename: path.join(
        logDirectory,
        process.env.NODE_ENV === "production"
          ? "prod-error.log"
          : "dev-error.log"
      ),
      level: "error",
    }),
    ...(process.env.NODE_ENV !== "production"
      ? [
          new transports.Console({
            format: format.combine(format.colorize(), baseFormat),
          }),
        ]
      : []),
    new transports.MongoDB({
      level: "error",
      db: MONGODB_URI,
      collection: "serverlogs",
      tryReconnect: true,
      format: format.combine(format.timestamp(), customFormat),
    }),
  ],
});

export default logger;
