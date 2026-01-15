import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";
import compression from "compression";
import bodyParser from "body-parser";
import logger from "./logger.js";
import { auditMiddleware } from "./middleware/auditTrail.mjs";

import getAllUsers from "./routes/getAllUsers.mjs";
import getUser from "./routes/getUser.mjs";
import login from "./routes/login.mjs";
import handleS3Deletation from "./routes/handleS3Deletation.mjs";

//HOME
import assignModules from "./routes/home/assignModules.mjs";
import assignRole from "./routes/home/assignRole.mjs";
import unassignModule from "./routes/home/unassignModules.mjs";
import changePassword from "./routes/home/changePassword.mjs";
import assignIcdCode from "./routes/home/assignIcdCode.mjs";

// Audit Trail
import auditTrail from "./routes/audit/auditTrail.mjs";

// directrories
import directory from "./routes/Directories/directory.js";
import state from "./routes/Directories/state.mjs";
import airline from "./routes/Directories/airlines.js";
import Country from "./routes/Directories/Country.js";
import TarrifHead from "./routes/Directories/tarrifhead.js";
import ShippingLine from "./routes/Directories/shippinglines.js";
import edilocations from "./routes/Directories/edilocations.js";
import nonedilocations from "./routes/Directories/nonedilocation.js";
import ports from "./routes/Directories/ports.js";
import airports from "./routes/Directories/airports.js";
import uqcs from "./routes/Directories/uqcs.js";
import Currency from "./routes/Directories/currencies.js";
import Packages from "./routes/Directories/packages.js";
import SupportingDocuments from "./routes/Directories/supportingdocumentcodes.js";
import genrateExportChecklist from "./routes/export-dsr/generateExportChecklist.mjs";
import gatwayPort from "./routes/Directories/gatwayPort.js"; //gatwatPort
import district from "./routes/Directories/districts.js"; //gatwatPort
import license from "./routes/Directories/license.js";
import getExportJobsModuleUsers from "./routes/export-dsr/getExportJobsModuleUsers.mjs";

//============== EXPORT DSR =========================
import getExJobsOverview from "./routes/export-dsr/getExJobsOverview.mjs";
import getExporterList from "./routes/export-dsr/getExporterList.mjs";
// import getExporterJobs from "./routes/export-dsr/getExporterJobs.mjs";
import addJobs from "./routes/export-dsr/add-exp-jobs.mjs";
import getExpJob from "./routes/export-dsr/getExpJob.mjs";
import updateExportJobs from "./routes/export-dsr/updateExportJobs.js";
import currencyRate from "./routes/currencyRate.js";
import deleteFromS3Routes from "./routes/deleteFromS3.js";

import getRodtep_R from "./routes/export-dsr/getRodtep_R.js";
import getCthsExport from "./routes/export-dsr/getCthsExport.js";
import getDrawback from "./routes/export-dsr/getDrawback.js";
import getRosctl_R from "./routes/export-dsr/getRosctl_R.js";
import feedback from "./routes/feedbackRoutes.js";

import getConsignees from "./routes/export-dsr/getConsignees.js";
import getHoToConsoleNames from "./routes/export-dsr/getHoToConsoleNames.js";
import rodtepReRoutes from "./routes/export-dsr/rodtepReRoutes.js";
import generateDSRReport from "./routes/export-dsr/generateDSRReport.mjs";
import openPointsRoutes from "./routes/open-points/openPointsRoutes.mjs";
import uploadRoutes from "./routes/uploadRoutes.js";

process.on("uncaughtException", (error) => {
  logger.error(`Uncaught Exception: ${error.message}`, { stack: error.stack });
});

process.on("unhandledRejection", (reason, promise) => {
  logger.error(`Unhandled Rejection at: ${promise} reason: ${reason}`);
});

dotenv.config();

const app = express();

// App middleware
app.use(bodyParser.json({ limit: "100mb" }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  cors({
    origin: [
      "http://eximdev.s3-website.ap-south-1.amazonaws.com",
      "http://localhost:3000",
      "http://localhost:5173",
      "http://test-ssl-exim.s3-website.ap-south-1.amazonaws.com",
      "http://exim-export.s3-website.ap-south-1.amazonaws.com",
      "https://export.alvision.in",
    ],
    credentials: true,
    // Allow custom headers for audit trail
    exposedHeaders: ["Content-Type", "Authorization"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "user-id",
      "username",
      "user-role",
      "x-username",
    ],
  })
);
app.use(compression({ level: 9 }));

const MONGODB_URI =
  process.env.NODE_ENV === "production"
    ? process.env.PROD_MONGODB_URI
    : process.env.NODE_ENV === "server"
      ? process.env.SERVER_MONGODB_URI
      : process.env.DEV_MONGODB_URI;

// MongoDB connection
mongoose.set("strictQuery", true);

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log("MongoDB connected");
  })
  .catch((err) => console.log("Error connecting to MongoDB:", err));

app.use(getAllUsers);
app.use(getUser);
app.use(login);
app.use(login);

//HOME
app.use(assignModules);
app.use(assignRole);
app.use(unassignModule);
app.use(changePassword);
app.use(assignIcdCode);

// handle delete
app.use(handleS3Deletation);

app.use(auditTrail);

//directories
app.use(auditMiddleware("Directory"), directory);
app.use("/api/states", auditMiddleware("Directory"), state);
app.use("/api/airlines", auditMiddleware("Directory"), airline);
app.use("/api/countries", auditMiddleware("Directory"), Country);
app.use("/api/tariffHeads", auditMiddleware("Directory"), TarrifHead);
app.use("/api/shippingLines", auditMiddleware("Directory"), ShippingLine);
app.use("/api/ediLocations", auditMiddleware("Directory"), edilocations);
app.use("/api/nonEdiLocations", auditMiddleware("Directory"), nonedilocations);
app.use("/api/ports", auditMiddleware("Directory"), ports);
app.use("/api/airPorts", auditMiddleware("Directory"), airports);
app.use("/api/uqcs", auditMiddleware("Directory"), uqcs);
app.use("/api/currencies", auditMiddleware("Directory"), Currency);
app.use("/api/packages", auditMiddleware("Directory"), Packages);
app.use(
  "/api/supportingDocumentCodes",
  auditMiddleware("Directory"),
  SupportingDocuments
);
app.use(genrateExportChecklist);
app.use(getExpJob);
app.use("/api/gateway-ports", auditMiddleware("Directory"), gatwayPort);
app.use("/api/districts", auditMiddleware("Directory"), district);
app.use("/api/licenses", auditMiddleware("Directory"), license);
// app.set("trust proxy", 1); // Trust first proxy (NGINX, AWS ELB, etc.)

//============== EXPORT DSR =========================
app.use("/api", updateExportJobs);
app.use(getExJobsOverview);
app.use(getExporterList);

// app.use(getExporterJobs);
app.use(addJobs);
app.use(getConsignees);
app.use(getHoToConsoleNames);
app.use(getExportJobsModuleUsers);
app.use(currencyRate);

app.use("/api", feedback);

app.use("/api", getRodtep_R);
app.use("/api/getCthsExport", getCthsExport);
app.use("/api/getDrawback", getDrawback);
app.use("/api", getRosctl_R);

app.use("/api", rodtepReRoutes);
app.use(generateDSRReport);
app.use(openPointsRoutes);
app.use("/api", uploadRoutes);

// s3 route

app.use(deleteFromS3Routes);

app.get("/", (req, res) => {
  res.send("Export Jobs API Running");
});

app.use("/api", updateExportJobs);

// Graceful shutdown
process.on("SIGINT", async () => {
  await mongoose.connection.close();
  console.log("Mongoose connection closed due to app termination");
  process.exit(0);
});
process.on("SIGTERM", async () => {
  await mongoose.connection.close();
  console.log("Mongoose connection closed due to app termination");
  process.exit(0);
});

// Start server
const PORT = process.env.PORT || 9002;
app.listen(PORT, () => {
  console.log(`🟢 Server listening on http://localhost:${PORT}`);
});
