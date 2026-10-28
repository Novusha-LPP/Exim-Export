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

  if (isClubActive && primaryJob) {
    const allJobsPool = [jobData, ...clubbedJobsData].filter(j => j && j.job_no !== primaryJob.job_no);
    const sharedFields = [
      "shipping_line_airline",
      "vessel_name",
      "booking_no",
      "cut_off_date",
      "booking_date",
      "gateway_port",
      "port_of_loading",
      "port_of_discharge",
      "discharge_port",
      "discharge_country",
      "destination_port",
      "destination_country",
      "sailing_date",
      "voyage_no",
      "forwarder",
      "exporter_address",
      "factory_address",
      "cha",
      "stuffing_seal_type",
      "goods_stuffed_at"
    ];

    for (const field of sharedFields) {
      if (!primaryJob[field] || String(primaryJob[field]).trim() === "") {
        for (const sourceJob of allJobsPool) {
          if (sourceJob[field] && String(sourceJob[field]).trim() !== "") {
            primaryJob[field] = sourceJob[field];
            break;
          }
        }
      }
    }
  }

  return { primaryJob, clubbedJobsData, isClubActive };
};