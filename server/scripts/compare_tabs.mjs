import axios from "axios";

async function compare() {
  const headers = { username: "Admin" };

  // 1. Fetch Sent for Billing jobs from overview
  const sentRes = await axios.get("http://localhost:9002/api/get-exjobs-overview/26-27", {
    params: { status: "Sent for Billing", limit: 200 },
    headers,
  });
  const sentJobs = sentRes.data?.jobs || sentRes.data?.data || sentRes.data || [];
  console.log("Jobs in 'Sent for Billing' (overview):", Array.isArray(sentJobs) ? sentJobs.length : typeof sentJobs);

  // 2. Fetch Billing Pending jobs in billing module
  const billPendingRes = await axios.get("http://localhost:9002/api/export-billing-jobs", {
    params: { tab: "billing-pending", workMode: "payment", year: "26-27", limit: 200 },
    headers,
  });
  const billPendingJobs = billPendingRes.data?.data?.jobs || [];
  console.log("Jobs in 'billing-pending' (billing module):", billPendingJobs.length);

  // Fetch all tabs in billing module
  const paymentRequested = (await axios.get("http://localhost:9002/api/export-billing-jobs", {
    params: { tab: "payment-requested", workMode: "payment", year: "26-27", limit: 200 },
    headers,
  })).data?.data?.jobs || [];
  console.log("Jobs in 'payment-requested':", paymentRequested.length);

  const payment = (await axios.get("http://localhost:9002/api/export-billing-jobs", {
    params: { tab: "payment", workMode: "payment", year: "26-27", limit: 200 },
    headers,
  })).data?.data?.jobs || [];
  console.log("Jobs in 'payment':", payment.length);

  const paymentCompleted = (await axios.get("http://localhost:9002/api/export-billing-jobs", {
    params: { tab: "payment-completed", workMode: "payment", year: "26-27", limit: 200 },
    headers,
  })).data?.data?.jobs || [];
  console.log("Jobs in 'payment-completed':", paymentCompleted.length);

  const completedBilling = (await axios.get("http://localhost:9002/api/export-billing-jobs", {
    params: { tab: "export-completed-billing", workMode: "payment", year: "26-27", limit: 5 },
    headers,
  })).data?.data?.total;
  console.log("Total in 'export-completed-billing':", completedBilling);

  // Check Sent for Billing jobs
  const jobList = Array.isArray(sentJobs.jobs) ? sentJobs.jobs : (Array.isArray(sentJobs) ? sentJobs : []);
  console.log("Sample sentJobs:", jobList.slice(0, 5).map(j => ({ job_no: j.job_no, status: j.status, detailedStatus: j.detailedStatus })));

  // Check how many of jobList are in paymentRequested, payment, paymentCompleted, etc.
  const inPending = [];
  const inReq = [];
  const inPay = [];
  const inPayComp = [];
  const inDone = [];
  const notFound = [];

  for (const sj of jobList) {
    const no = sj.job_no;
    if (billPendingJobs.some(j => j.job_no === no)) inPending.push(no);
    else if (paymentRequested.some(j => j.job_no === no)) inReq.push(no);
    else if (payment.some(j => j.job_no === no)) inPay.push(no);
    else if (paymentCompleted.some(j => j.job_no === no)) inPayComp.push(no);
    else notFound.push(no);
  }

  console.log("\n--- DISTRIBUTION OF 'Sent for Billing' (59/62 jobs) IN BILLING MODULE ---");
  console.log("In 'Billing Pending':", inPending.length);
  console.log("In 'Payment Requested':", inReq.length, inReq.slice(0, 3));
  console.log("In 'Payment':", inPay.length, inPay.slice(0, 3));
  console.log("In 'Payment Completed':", inPayComp.length, inPayComp.slice(0, 3));
  console.log("Not in any of the above 4:", notFound.length, notFound.slice(0, 5));

  // Check what notFound jobs have:
  if (notFound.length > 0) {
    const r = await axios.get("http://localhost:9002/api/export-billing-jobs", {
      params: { tab: "export-completed-billing", workMode: "payment", year: "26-27", limit: 200, search: notFound[0] },
      headers,
    });
    console.log(`Is ${notFound[0]} in export-completed-billing?`, (r.data?.data?.jobs || []).length > 0);
  }
}

compare().catch(console.error);
