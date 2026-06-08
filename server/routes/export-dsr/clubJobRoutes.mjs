import express from "express";
import ExJobModel from "../../model/export/ExJobModel.mjs";
import { auditMiddleware } from "../../middleware/auditTrail.mjs";

const router = express.Router();

router.post("/create-club-job", auditMiddleware("Job"), async (req, res) => {
  try {
    const { selected_job_nos, primary_job_no } = req.body;

    if (!selected_job_nos || !Array.isArray(selected_job_nos) || selected_job_nos.length === 0) {
      return res.status(400).json({ success: false, message: "Please select at least one job to club." });
    }

    if (!primary_job_no) {
      return res.status(400).json({ success: false, message: "Primary job number is required to form a club job." });
    }

    // Fetch the parent job
    const parentJob = await ExJobModel.findOne({ job_no: primary_job_no });
    if (!parentJob) {
       return res.status(404).json({ success: false, message: "Primary job not found." });
    }

    let tallyRefNo = parentJob.tally_club_ref_no;

    // If the parent job doesn't have a tally_club_ref_no, generate one
    if (!tallyRefNo) {
      const year = parentJob.year;
      const branch = parentJob.branch_code || "AMD";
      const mode = parentJob.transportMode === "AIR" ? "AIR" : "SEA";
      
      let prefixRegex;
      if (parentJob.isGeneralJob) {
        prefixRegex = new RegExp(`^C1/GEN/EXP/\\d+/${year}$`, 'i');
      } else {
        prefixRegex = new RegExp(`^C1/${branch}/EXP/${mode}/\\d+/${year}$`, 'i');
      }

      const existingClubJobs = await ExJobModel.find({
        tally_club_ref_no: prefixRegex
      }).select('tally_club_ref_no').lean();

      // Fallback search in job_no for legacy C1 jobs to ensure sequence continuation
      const legacyClubJobs = await ExJobModel.find({
        job_no: prefixRegex
      }).select('job_no').lean();

      let maxNum = 0;
      
      const parseNum = (refStr) => {
        if (!refStr) return;
        const parts = refStr.split('/');
        let currentNum = 0;
        if (parentJob.isGeneralJob) {
            currentNum = parseInt(parts[3], 10);
        } else {
            currentNum = parseInt(parts[4], 10);
        }
        if (!isNaN(currentNum) && currentNum > maxNum) {
          maxNum = currentNum;
        }
      };

      existingClubJobs.forEach(job => parseNum(job.tally_club_ref_no));
      legacyClubJobs.forEach(job => parseNum(job.job_no));

      const nextNum = maxNum + 1;
      if (parentJob.isGeneralJob) {
          tallyRefNo = `C1/GEN/EXP/${String(nextNum).padStart(5, '0')}/${year}`;
      } else {
          tallyRefNo = `C1/${branch}/EXP/${mode}/${String(nextNum).padStart(5, '0')}/${year}`;
      }
    }

    // Find all jobs that are currently children of this parent
    const existingChildren = await ExJobModel.find({ parent_club_job: primary_job_no });
    const existingChildNos = existingChildren.map(j => j.job_no);

    // Identify children to remove: those that were in the club but are not in selected_job_nos anymore
    const childJobsToRemove = existingChildNos.filter(j => !selected_job_nos.includes(j));
    if (childJobsToRemove.length > 0) {
      await ExJobModel.updateMany(
        { job_no: { $in: childJobsToRemove } },
        { 
          $unset: { parent_club_job: "", tally_club_ref_no: "" }
        }
      );
    }

    // Identify children to add/update
    const childJobsToUpdate = selected_job_nos.filter(j => j !== primary_job_no);

    if (childJobsToUpdate.length === 0) {
      // No children left, dissolve the club!
      parentJob.is_club_job_parent = false;
      parentJob.clubbed_jobs = [];
      parentJob.tally_club_ref_no = undefined;
      await parentJob.save();
      tallyRefNo = undefined;
    } else {
      // Update parent
      parentJob.is_club_job_parent = true;
      parentJob.clubbed_jobs = selected_job_nos;
      parentJob.tally_club_ref_no = tallyRefNo;
      await parentJob.save();

      // Update active child jobs
      await ExJobModel.updateMany(
        { job_no: { $in: childJobsToUpdate } },
        { 
          $set: { 
            parent_club_job: primary_job_no,
            tally_club_ref_no: tallyRefNo 
          } 
        }
      );
    }

    res.status(200).json({ 
      success: true, 
      message: childJobsToUpdate.length === 0 ? "Club Job dissolved successfully" : "Club Job updated successfully", 
      job_no: primary_job_no, 
      tally_ref: tallyRefNo,
      data: parentJob 
    });

  } catch (error) {
    console.error("Error creating club job:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

export default router;
