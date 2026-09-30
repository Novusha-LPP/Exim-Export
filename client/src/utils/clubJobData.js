import axios from "axios";

export const loadClubJobData = async (jobData) => {
  let primaryJob = jobData;

  if (primaryJob?.parent_club_job) {
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_STRING}/get-export-job/${encodeURIComponent(primaryJob.parent_club_job)}`
      );
      if (response.data) primaryJob = response.data;
    } catch (error) {
      console.warn("Failed to load club parent job:", error);
    }
  }

  const isClubActive = Boolean(
    primaryJob?.is_club_job_parent || primaryJob?.parent_club_job
  );
  const childJobNos = primaryJob?.is_club_job_parent && Array.isArray(primaryJob.clubbed_jobs)
    ? [...new Set(primaryJob.clubbed_jobs.filter((childJobNo) => childJobNo && childJobNo !== primaryJob.job_no))]
    : [];

  const clubbedJobsData = (await Promise.all(childJobNos.map(async (childJobNo) => {
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_STRING}/get-export-job/${encodeURIComponent(childJobNo)}`
      );
      return response.data || null;
    } catch (error) {
      console.warn(`Failed to load club child job ${childJobNo}:`, error);
      return null;
    }
  }))).filter(Boolean);

  return { primaryJob, clubbedJobsData, isClubActive };
};