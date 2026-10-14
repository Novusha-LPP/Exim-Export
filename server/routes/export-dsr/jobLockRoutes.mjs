import express from "express";
import ExJobModel from "../../model/export/ExJobModel.mjs";
import UserModel from "../../model/userModel.mjs";
import {
  extractJobNoFromPath,
  findJobByJobNoOrEnquiry,
} from "./exportJobHelpers.mjs";

const router = express.Router();

// Lock a job
router.put("/:job_no(.*)/lock", async (req, res) => {
  try {
    const job_no = extractJobNoFromPath(req, "lock");
    const { username } = req.body;

    if (!username) {
      return res.status(400).json({ message: "Username is required to lock" });
    }

    const job = await findJobByJobNoOrEnquiry(job_no);

    if (!job) return res.status(404).json({ message: "Job not found" });

    const userRoleHeader = req.headers["user-role"] || req.headers["x-user-role"];
    let isAdmin = userRoleHeader === "Admin";
    if (!isAdmin && username) {
      const requester = await UserModel.findOne({
        username: { $regex: `^${username}$`, $options: "i" }
      }).lean();
      isAdmin = requester?.role === "Admin";
    }

    // IF AN ADMIN IS OPENING THE JOB:
    // Admin opening/editing a job MUST NOT lock it for other users
    if (isAdmin) {
      let isLockerAdmin = false;
      if (job.lockedBy) {
        const locker = await UserModel.findOne({
          username: { $regex: `^${job.lockedBy}$`, $options: "i" }
        }).lean();
        isLockerAdmin = locker?.role === "Admin";
      }
      if (isLockerAdmin) {
        job.lockedBy = null;
        job.lockedAt = null;
        await job.save();
      }
      return res.json({ message: "Job locked successfully", lockedBy: null, isAdmin: true });
    }

    // FOR REGULAR (NON-ADMIN) USERS:
    let isLockerAdmin = false;
    if (job.lockedBy) {
      const locker = await UserModel.findOne({
        username: { $regex: `^${job.lockedBy}$`, $options: "i" }
      }).lean();
      isLockerAdmin = locker?.role === "Admin";
    }

    const LOCK_TIMEOUT = 30 * 60 * 1000;
    const isStale =
      job.lockedAt && new Date() - new Date(job.lockedAt) > LOCK_TIMEOUT;

    if (
      job.lockedBy &&
      (job.lockedBy || "").toLowerCase() !== (username || "").toLowerCase() &&
      !isStale &&
      !isLockerAdmin
    ) {
      return res.status(423).json({
        message: `Already locked by ${job.lockedBy}`,
        lockedBy: job.lockedBy,
      });
    }

    job.lockedBy = username;
    job.lockedAt = new Date();
    await job.save();

    res.json({ message: "Job locked successfully", lockedBy: username });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Unlock a job (Supports both PUT and POST for sendBeacon support)
router.route("/:job_no(.*)/unlock").all(async (req, res) => {
  try {
    const job_no = extractJobNoFromPath(req, "unlock");
    const { username } = req.body;

    const job = await findJobByJobNoOrEnquiry(job_no);

    if (!job) return res.status(404).json({ message: "Job not found" });

    if ((job.lockedBy || "").toLowerCase() === (username || "").toLowerCase()) {
      job.lockedBy = null;
      job.lockedAt = null;
      await job.save();
      return res.json({ message: "Job unlocked successfully" });
    }

    return res.json({ message: "Job released" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Track click on a document (esanchit, checklist, file_cover)
router.put("/:job_no(.*)/track-click", async (req, res) => {
  try {
    const job_no = extractJobNoFromPath(req, "track-click");
    const { docType } = req.body;
    const username = req.headers["username"] || "unknown";

    if (!docType || !["checklist", "file_cover", "esanchit"].includes(docType)) {
      return res.status(400).json({ message: "Invalid or missing docType" });
    }

    const job = await findJobByJobNoOrEnquiry(job_no);

    if (!job) return res.status(404).json({ message: "Job not found" });

    if (!job.docClicks) {
      job.docClicks = {};
    }

    job.docClicks[docType] = {
      clickedBy: username,
      clickedAt: new Date()
    };

    job.markModified("docClicks");
    await job.save();

    res.json({ message: "Click tracked successfully", docClicks: job.docClicks });
  } catch (error) {
    console.error("Error tracking doc click:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Clear SB or Seal change notification
router.put("/:job_no(.*)/clear-sb-seal-notif", async (req, res) => {
  try {
    const raw = req.params.job_no || "";
    const job_no = decodeURIComponent(raw);

    const updatedJob = await ExJobModel.findOneAndUpdate(
      { job_no: { $regex: `^${job_no}$`, $options: "i" } },
      { $set: { sb_or_seal_changed_notif: false } },
      { new: true }
    );

    if (!updatedJob) {
      return res.status(404).json({ success: false, message: "Job not found" });
    }

    res.json({ success: true, message: "Notification cleared successfully", data: updatedJob });
  } catch (error) {
    console.error("Error clearing notification:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

export default router;
