import express from "express";
import ExJobModel from "../../model/export/ExJobModel.mjs";
import VirtualBalanceModel from "../../model/export/virtualBalanceModel.mjs";
import PurchaseBookEntryModel from "../../model/export/purchaseBookEntryModel.mjs";
import TerminalCodeModel from "../../model/Directorties/TerminalCode.js";
import EmptyYardDirectoryModel from "../../model/Directorties/EmptyYardDirectory.js";
import CfsDirectoryModel from "../../model/Directorties/CfsDirectory.js";
import { auditMiddleware } from "../../middleware/auditTrail.mjs";

const router = express.Router();

const getBalanceType = (req) =>
  (req.path.includes("cfs-virtual-balance") || req.path.includes("cfs") || req.query?.type?.toUpperCase?.() === "CFS" || req.query?.balanceType?.toUpperCase?.() === "CFS")
    ? "CFS"
    : "TERMINAL";

const balanceFilter = (req) => getBalanceType(req) === "CFS"
  ? { balanceType: "CFS" }
  : { $or: [{ balanceType: "TERMINAL" }, { balanceType: { $exists: false } }, { balanceType: "" }, { balanceType: null }] };

// Helper to look up exporter name
async function getExporterName(jobNo) {
  if (!jobNo) return "";
  const trimmed = jobNo.trim();
  const job = await ExJobModel.findOne({
    job_no: { $regex: new RegExp(`^${trimmed.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") }
  }).select("exporter exporter_name name").lean();
  if (!job) return "";
  return job.exporter || job.exporter_name || job.name || "";
}

// GET /api/virtual-balance & /api/cfs-virtual-balance - Fetch list of virtual balances with running balances
router.get(["/api/virtual-balance", "/api/cfs-virtual-balance"], async (req, res) => {
  try {
    const { page = 1, limit = 50, search = "", status = "", startDate = "", endDate = "" } = req.query;
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 50;
    const skip = (pageNum - 1) * limitNum;

    const type = getBalanceType(req);

    // 1. Fetch all virtual balances in chronological order
    const allBalances = await VirtualBalanceModel.find(balanceFilter(req)).sort({ createdAt: 1 }).lean();

    // 2. Fetch all purchase books for the jobs involved in these balances
    const jobNosSet = new Set();
    allBalances.forEach((b) => {
      if (b.jobNo) {
        b.jobNo.split(",").forEach(j => jobNosSet.add(j.trim()));
      }
    });
    const purchaseBooks = await PurchaseBookEntryModel.find({
      jobNo: { $in: [...jobNosSet] },
    }).lean();

    // 3. Map purchase books by jobNo and supplierName (or virtualBalanceTerminal override)
    const pbSumMap = {};
    purchaseBooks.forEach((pb) => {
      if (!pb.jobNo) return;
      const targetTerminal = (pb.virtualBalanceTerminal || pb.supplierName || "").trim().toUpperCase();
      if (!targetTerminal) return;
      const pbBalanceType = String(pb.virtualBalanceType || (pb.virtualBalanceTerminal ? "TERMINAL" : "")).toUpperCase();
      if (type === "CFS" && pbBalanceType !== "CFS") return;
      if (type === "TERMINAL" && pbBalanceType === "CFS") return;

      const key = `${pb.jobNo.trim().toUpperCase()}_${targetTerminal}`;
      const netAmt = pb.netAmount !== undefined && pb.netAmount !== null
        ? pb.netAmount
        : ((pb.total || 0) - (pb.tds || 0));
      pbSumMap[key] = (pbSumMap[key] || 0) + netAmt;
    });

    // 4. Fetch all directory opening balances
    const cfsList = type === "CFS" ? await CfsDirectoryModel.find().lean() : await EmptyYardDirectoryModel.find().lean();
    const cfsOpeningMap = {};
    cfsList.forEach((c) => {
      if (c.name) {
        cfsOpeningMap[c.name.trim().toUpperCase()] = c.openingBalance || 0;
      }
    });

    // 5. Calculate running balances chronologically
    const cfsRunningMap = {};
    const calculatedEntries = allBalances.map((entry) => {
      const cfsKey = entry.cfsName.trim().toUpperCase();
      const initialBalance = cfsOpeningMap[cfsKey] || 0;
      const openingBalance = cfsRunningMap[cfsKey] !== undefined ? cfsRunningMap[cfsKey] : initialBalance;
      const amountPaid = entry.amountPaid || 0;
      const availableBalance = openingBalance + amountPaid;

      // Get purchase books filed for this job and CFS
      let spentAmount = 0;
      if (entry.jobNo) {
        const individualJobs = entry.jobNo.split(",").map(j => j.trim().toUpperCase());
        individualJobs.forEach(j => {
          const pbKey = `${j}_${cfsKey}`;
          spentAmount += (pbSumMap[pbKey] || 0);
        });
      }

      const remainingBalance = availableBalance - spentAmount;

      // Update running balance for next entry of this CFS
      cfsRunningMap[cfsKey] = remainingBalance;

      return {
        ...entry,
        openingBalance,
        availableBalance,
        spentAmount,
        remainingBalance,
      };
    });

    // 6. Apply filters and search in memory
    let filtered = [...calculatedEntries];

    if (status) {
      const matchStatus = status.toLowerCase();
      filtered = filtered.filter((e) => e.status && e.status.toLowerCase() === matchStatus);
    }

    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      filtered = filtered.filter((e) => new Date(e.createdAt) >= start);
    }

    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      filtered = filtered.filter((e) => new Date(e.createdAt) <= end);
    }

    if (search && search.trim()) {
      const term = search.trim().toLowerCase();
      filtered = filtered.filter((e) => {
        const refNo = (e.referenceNo || "").toLowerCase();
        const cfs = (e.cfsName || "").toLowerCase();
        const jNo = (e.jobNo || "").toLowerCase();
        const party = (e.partyName || "").toLowerCase();
        const utrVal = (e.utr || "").toLowerCase();
        const bank = (e.fromBank || "").toLowerCase();
        const rem = (e.remarks || "").toLowerCase();
        return (
          refNo.includes(term) ||
          cfs.includes(term) ||
          jNo.includes(term) ||
          party.includes(term) ||
          utrVal.includes(term) ||
          bank.includes(term) ||
          rem.includes(term)
        );
      });
    }

    const totalRecords = filtered.length;

    // Summary calculation
    const totalDeposited = filtered.reduce((acc, curr) => acc + (curr.amountPaid || 0), 0);
    const totalSpent = filtered.reduce((acc, curr) => acc + (curr.spentAmount || 0), 0);
    const untaggedDeposits = filtered
      .filter((e) => !e.jobNo || e.jobNo.trim() === "")
      .reduce((acc, curr) => acc + (curr.amountPaid || 0), 0);

    // Sort descending for display (newest first)
    filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Pagination
    const paginatedEntries = filtered.slice(skip, skip + limitNum);

    res.status(200).json({
      success: true,
      data: paginatedEntries,
      summary: {
        totalDeposited,
        totalSpent,
        untaggedDeposits,
      },
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(totalRecords / limitNum),
        totalRecords,
        limit: limitNum,
      },
    });
  } catch (error) {
    console.error("Error fetching virtual balance:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// POST /api/virtual-balance & /api/cfs-virtual-balance - Create a new virtual balance entry
router.post(["/api/virtual-balance", "/api/cfs-virtual-balance"], auditMiddleware("Billing"), async (req, res) => {
  try {
    const { cfsName, jobNo, amountPaid, utr, fromBank, remarks, status = "unpaid", fileUrl } = req.body;
    const type = getBalanceType(req);

    if (!cfsName || amountPaid === undefined) {
      return res.status(400).json({ success: false, message: "Name and Amount Paid are required." });
    }

    // Use partyName from request body if provided (client sends formatted string for multi-job)
    const partyName = req.body.partyName !== undefined
      ? req.body.partyName
      : (jobNo ? await getExporterName(jobNo) : "");

    // Sequence generation: VB/EXP/YYYY/XXXX or VB/EXP/CFS/YYYY/XXXX
    const year = new Date().getFullYear();
    const prefix = type === "CFS" ? `VB/EXP/CFS` : `VB/EXP`;
    const count = await VirtualBalanceModel.countDocuments({
      ...balanceFilter(req),
      referenceNo: new RegExp(`^${prefix}/${year}/`, "i"),
    });

    let nextSeq = count + 1;
    let referenceNo = `${prefix}/${year}/${String(nextSeq).padStart(4, "0")}`;

    // Ensure uniqueness
    let exists = await VirtualBalanceModel.findOne({ referenceNo });
    while (exists) {
      nextSeq += 1;
      referenceNo = `${prefix}/${year}/${String(nextSeq).padStart(4, "0")}`;
      exists = await VirtualBalanceModel.findOne({ referenceNo });
    }

    const paymentDate = status.toLowerCase() === "paid" ? new Date() : null;

    const newEntry = new VirtualBalanceModel({
      referenceNo,
      cfsName,
      balanceType: type,
      jobNo: jobNo || "",
      partyName,
      amountPaid,
      utr,
      fromBank,
      remarks,
      status: status.toLowerCase(),
      paymentDate,
      fileUrl,
    });

    await newEntry.save();

    res.status(201).json({ success: true, message: "Virtual Balance entry created successfully", data: newEntry });
  } catch (error) {
    console.error("Error creating virtual balance:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// PUT /api/virtual-balance/:id & /api/cfs-virtual-balance/:id - Update an existing virtual balance entry
router.put(["/api/virtual-balance/:id", "/api/cfs-virtual-balance/:id"], auditMiddleware("Billing"), async (req, res) => {
  try {
    const { cfsName, jobNo, amountPaid, utr, fromBank, remarks, status, fileUrl } = req.body;
    const entryId = req.params.id;

    const entry = await VirtualBalanceModel.findOne({ _id: entryId, ...balanceFilter(req) });
    if (!entry) {
      return res.status(404).json({ success: false, message: "Entry not found" });
    }

    if (cfsName) entry.cfsName = cfsName;

    if (jobNo !== undefined) {
      entry.jobNo = (jobNo || "").trim();
      if (req.body.partyName !== undefined) {
        entry.partyName = req.body.partyName;
      }
    }

    if (amountPaid !== undefined) entry.amountPaid = amountPaid;
    if (utr !== undefined) entry.utr = utr;
    if (fromBank !== undefined) entry.fromBank = fromBank;
    if (remarks !== undefined) entry.remarks = remarks;
    if (fileUrl !== undefined) entry.fileUrl = fileUrl;

    if (status && status.toLowerCase() !== entry.status) {
      const prevStatus = entry.status;
      entry.status = status.toLowerCase();
      if (entry.status === "paid" && prevStatus !== "paid") {
        entry.paymentDate = new Date();
      } else if (entry.status === "unpaid") {
        entry.paymentDate = null;
      }
    }

    await entry.save();

    res.status(200).json({ success: true, message: "Virtual Balance updated successfully", data: entry });
  } catch (error) {
    console.error("Error updating virtual balance:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// DELETE /api/virtual-balance/:id & /api/cfs-virtual-balance/:id - Delete a virtual balance entry
router.delete(["/api/virtual-balance/:id", "/api/cfs-virtual-balance/:id"], auditMiddleware("Billing"), async (req, res) => {
  try {
    const deleted = await VirtualBalanceModel.findOneAndDelete({ _id: req.params.id, ...balanceFilter(req) });
    if (!deleted) {
      return res.status(404).json({ success: false, message: "Entry not found" });
    }
    res.status(200).json({ success: true, message: "Entry deleted successfully" });
  } catch (error) {
    console.error("Error deleting virtual balance:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// GET /api/virtual-balance/job-details/:jobNo & /api/cfs-virtual-balance/job-details/:jobNo
router.get(["/api/virtual-balance/job-details/:jobNo", "/api/cfs-virtual-balance/job-details/:jobNo"], async (req, res) => {
  try {
    const partyName = await getExporterName(req.params.jobNo);
    res.status(200).json({ success: true, partyName });
  } catch (error) {
    console.error("Error fetching job details:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// Helper function to escape regex characters
function escapeRegex(string) {
  return string.replace(/[/\-\\^$*+?.()|[\]{}]/g, "\\$&");
}

// GET /api/virtual-balance/job-purchase-books & /api/cfs-virtual-balance/job-purchase-books
router.get(["/api/virtual-balance/job-purchase-books", "/api/cfs-virtual-balance/job-purchase-books"], async (req, res) => {
  try {
    const { jobNo, cfsName } = req.query;

    if (!jobNo || !cfsName) {
      return res.status(400).json({ success: false, message: "Job No and Name are required." });
    }

    const type = getBalanceType(req);
    const cfsRegex = new RegExp(`^${escapeRegex(cfsName.trim())}$`, "i");

    const purchaseBooks = await PurchaseBookEntryModel.find({
      jobNo: { $in: jobNo.split(",").map(j => j.trim().toUpperCase()) },
      $or: [
        { virtualBalanceTerminal: { $regex: cfsRegex }, virtualBalanceType: type },
        {
          $and: [
            { $or: [{ virtualBalanceTerminal: { $exists: false } }, { virtualBalanceTerminal: "" }, { virtualBalanceTerminal: null }] },
            ...(type === "TERMINAL" ? [{ $or: [{ virtualBalanceType: { $exists: false } }, { virtualBalanceType: "" }, { virtualBalanceType: "TERMINAL" }, { virtualBalanceType: null }] }] : []),
            { supplierName: { $regex: cfsRegex } }
          ]
        }
      ]
    }).lean();

    res.status(200).json({ success: true, data: purchaseBooks });
  } catch (error) {
    console.error("Error fetching comparison purchase books:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// GET /api/virtual-balance/jobs & /api/cfs-virtual-balance/jobs
router.get(["/api/virtual-balance/jobs", "/api/cfs-virtual-balance/jobs"], async (req, res) => {
  try {
    const { search = "" } = req.query;
    const query = search
      ? { job_no: { $regex: new RegExp(escapeRegex(search.trim()), "i") } }
      : {};
    const jobs = await ExJobModel.find(query)
      .select("job_no exporter exporter_name name")
      .limit(200)
      .lean();
    const data = jobs.map((j) => ({
      jobNo: j.job_no || "",
      partyName: j.exporter || j.exporter_name || j.name || "",
    }));
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("Error fetching jobs list:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// GET distinct terminal / cfs names that have virtual balance entries
router.get([
  "/virtual-balance/created-terminals",
  "/api/virtual-balance/created-terminals",
  "/cfs-virtual-balance/created-names",
  "/api/cfs-virtual-balance/created-names",
  "/empty-yard-virtual-balance/created-names",
  "/api/empty-yard-virtual-balance/created-names"
], async (req, res) => {
  try {
    const distinctTerminals = await VirtualBalanceModel.distinct("cfsName", balanceFilter(req));
    const validTerminals = (distinctTerminals || [])
      .filter((t) => t && typeof t === "string" && t.trim() !== "")
      .map((t) => t.trim().toUpperCase())
      .sort();
    const unique = [...new Set(validTerminals)];
    res.status(200).json({ success: true, data: unique });
  } catch (error) {
    console.error("Error fetching created virtual balance names:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

export default router;
