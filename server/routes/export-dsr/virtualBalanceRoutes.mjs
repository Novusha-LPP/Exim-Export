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

// Helper to sanitize party name (remove any duplicated "JOB_NO: " prefixes and deduplicate)
function cleanPartyName(partyName) {
  if (!partyName || typeof partyName !== "string") return "";
  const lines = partyName
    .split(/[\r\n]+/)
    .map((line) => {
      const trimmed = line.trim();
      const colonIdx = trimmed.indexOf(":");
      if (colonIdx !== -1) {
        return trimmed.slice(colonIdx + 1).trim();
      }
      return trimmed;
    })
    .filter(Boolean);
  return [...new Set(lines)].join("\n");
}

function escapeRegex(string) {
  return string.replace(/[/[\-\\^$*+?.()|[\]{}]/g, "\\$&");
}

function extractJobTokens(str) {
  if (!str) return [];
  return str.split(",").map((s) => s.trim()).filter(Boolean);
}

function jobTokensMatch(jobStr1, jobStr2) {
  if (!jobStr1 || !jobStr2) return false;
  const s1 = jobStr1.trim().toUpperCase();
  const s2 = jobStr2.trim().toUpperCase();
  if (s1 === s2) return true;
  if (s1.includes(s2) || s2.includes(s1)) return true;

  const parts1 = s1.split("/");
  const parts2 = s2.split("/");

  if (parts1.length >= 4 && parts2.length >= 4) {
    const branch1 = parts1[0];
    const seq1 = parts1[3].replace(/^0+/, "");
    const branch2 = parts2[0];
    const seq2 = parts2[3].replace(/^0+/, "");
    return branch1 === branch2 && seq1 === seq2;
  }

  const getSeq = (s) => {
    const match = s.match(/(?:^|\/|-)(\d{3,5})(?:\/|-|$)/);
    if (match) return match[1].replace(/^0+/, "");
    const numOnly = s.match(/\d+/);
    return numOnly ? numOnly[0].replace(/^0+/, "") : null;
  };

  const seq1 = getSeq(s1);
  const seq2 = getSeq(s2);
  return Boolean(seq1 && seq2 && seq1 === seq2);
}

function isPbForVirtualBalanceEntry(entryJobNo, pbJobNo) {
  if (!entryJobNo || !pbJobNo) return false;
  const entryJobs = extractJobTokens(entryJobNo);
  return entryJobs.some((ej) => jobTokensMatch(ej, pbJobNo));
}

async function getExporterName(jobNo) {
  if (!jobNo) return "";
  const trimmed = jobNo.trim();
  const seqMatch = trimmed.match(/(?:^|\/|-)(\d{3,5})(?:\/|-|$)/) || trimmed.match(/\d+/);
  const conditions = [
    { job_no: { $regex: new RegExp(`^${escapeRegex(trimmed)}$`, "i") } },
    { jobNumber: { $regex: new RegExp(`^${escapeRegex(trimmed)}$`, "i") } },
    { custom_job_no: { $regex: new RegExp(`^${escapeRegex(trimmed)}$`, "i") } },
  ];
  if (seqMatch) {
    const seqNum = parseInt(seqMatch[1] || seqMatch[0], 10);
    const flexRegex = new RegExp(`(?:^|/|-)0*${seqNum}(?:/|-|$)`, "i");
    conditions.push({ job_no: { $regex: flexRegex } });
    conditions.push({ jobNumber: { $regex: flexRegex } });
  }

  const job = await ExJobModel.findOne({ $or: conditions })
    .select("exporter exporter_name name")
    .lean();
  if (!job) return "";
  return job.exporter || job.exporter_name || job.name || "";
}

// GET /api/virtual-balance & /api/cfs-virtual-balance
router.get(["/api/virtual-balance", "/api/cfs-virtual-balance"], async (req, res) => {
  try {
    const { page = 1, limit = 50, search = "", status = "", startDate = "", endDate = "" } = req.query;
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 50;
    const skip = (pageNum - 1) * limitNum;

    const type = getBalanceType(req);
    const allBalances = await VirtualBalanceModel.find(balanceFilter(req)).sort({ createdAt: 1 }).lean();

    const jobTokens = [];
    allBalances.forEach((b) => {
      if (b.jobNo) {
        b.jobNo.split(",").forEach((t) => {
          const trimmed = t.trim();
          if (trimmed) jobTokens.push(trimmed);
        });
      }
    });

    let pbQuery = {};
    if (jobTokens.length > 0) {
      const orConditions = [];
      jobTokens.forEach((jt) => {
        const escaped = escapeRegex(jt);
        orConditions.push({ jobNo: { $regex: new RegExp(escaped, "i") } });
        orConditions.push({ entryNo: { $regex: new RegExp(escaped, "i") } });
        const seqMatch = jt.match(/(?:^|\/|-)(\d{3,5})(?:\/|-|$)/) || jt.match(/\d+/);
        if (seqMatch) {
          const seqNum = parseInt(seqMatch[1] || seqMatch[0], 10);
          const flexRegex = new RegExp(`(?:^|/|-)0*${seqNum}(?:/|-|$)`, "i");
          orConditions.push({ jobNo: { $regex: flexRegex } });
          orConditions.push({ entryNo: { $regex: flexRegex } });
        }
      });
      pbQuery = { $or: orConditions };
    }

    const purchaseBooks = await PurchaseBookEntryModel.find(pbQuery).lean();

    let cfsList = [];
    if (type === "CFS") {
      cfsList = await CfsDirectoryModel.find().lean();
    } else {
      const [eyList, termList] = await Promise.all([
        EmptyYardDirectoryModel.find().lean(),
        TerminalCodeModel.find().lean(),
      ]);
      cfsList = [...eyList, ...termList];
    }
    const cfsOpeningMap = {};
    const cfsBankMap = {};
    cfsList.forEach((c) => {
      if (c.name) {
        const key = c.name.trim().toUpperCase();
        cfsOpeningMap[key] = c.openingBalance || 0;
        if (Array.isArray(c.branches)) {
          const acc = c.branches.flatMap((b) => b.accounts || []).find((a) => a && (a.accountNo || a.bankName));
          if (acc) {
            cfsBankMap[key] = {
              accountNo: acc.accountNo || "",
              bankName: acc.bankName || "",
              ifsc: acc.ifsc || "",
            };
          }
        }
      }
    });

    const cfsRunningMap = {};
    const calculatedEntries = allBalances.map((entry) => {
      const cfsKey = entry.cfsName.trim().toUpperCase();
      const initialBalance = cfsOpeningMap[cfsKey] || 0;
      const openingBalance = cfsRunningMap[cfsKey] !== undefined ? cfsRunningMap[cfsKey] : initialBalance;
      const amountPaid = entry.amountPaid || 0;
      const availableBalance = openingBalance + amountPaid;

      let spentAmount = 0;
      if (entry.jobNo) {
        const matchingPbs = purchaseBooks.filter((pb) => {
          const targetTerminal = (pb.virtualBalanceTerminal || pb.supplierName || "").trim().toUpperCase();
          if (targetTerminal !== cfsKey) return false;
          const pbBalanceType = String(pb.virtualBalanceType || "TERMINAL").toUpperCase();
          if (pbBalanceType !== type) return false;
          return isPbForVirtualBalanceEntry(entry.jobNo, pb.jobNo || pb.entryNo);
        });

        spentAmount = matchingPbs.reduce((sum, pb) => sum + ((pb.total || 0) - (pb.tds || 0)), 0);
      }

      const remainingBalance = availableBalance - spentAmount;
      cfsRunningMap[cfsKey] = remainingBalance;

      const bankInfo = cfsBankMap[cfsKey] || {};
      const bankAccountNo = entry.bankAccountNo || bankInfo.accountNo || "";
      const bankName = entry.bankName || bankInfo.bankName || "";
      const bankIfsc = entry.bankIfsc || bankInfo.ifsc || "";

      return {
        ...entry,
        partyName: cleanPartyName(entry.partyName),
        openingBalance,
        availableBalance,
        spentAmount,
        remainingBalance,
        bankAccountNo,
        bankName,
        bankIfsc,
      };
    });

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
        return (
          (e.referenceNo && e.referenceNo.toLowerCase().includes(term)) ||
          (e.jobNo && e.jobNo.toLowerCase().includes(term)) ||
          (e.cfsName && e.cfsName.toLowerCase().includes(term)) ||
          (e.partyName && e.partyName.toLowerCase().includes(term)) ||
          (e.bankAccountNo && e.bankAccountNo.toLowerCase().includes(term)) ||
          (e.bankName && e.bankName.toLowerCase().includes(term)) ||
          (e.bankIfsc && e.bankIfsc.toLowerCase().includes(term)) ||
          (e.utr && e.utr.toLowerCase().includes(term)) ||
          (e.remarks && e.remarks.toLowerCase().includes(term))
        );
      });
    }

    filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const total = filtered.length;
    const paginatedEntries = filtered.slice(skip, skip + limitNum);

    res.status(200).json({
      success: true,
      data: {
        entries: paginatedEntries,
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    });
  } catch (error) {
    console.error("Error fetching virtual balances:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// POST /api/virtual-balance
router.post(["/api/virtual-balance", "/api/cfs-virtual-balance"], auditMiddleware("Billing"), async (req, res) => {
  try {
    const { cfsName, jobNo, amountPaid, utr, fromBank, remarks, status = "unpaid", fileUrl } = req.body;
    const type = getBalanceType(req);

    if (!cfsName || amountPaid === undefined) {
      return res.status(400).json({ success: false, message: "CFS Name and Amount Paid are required." });
    }

    const partyName = req.body.partyName !== undefined
      ? cleanPartyName(req.body.partyName)
      : (jobNo ? await getExporterName(jobNo) : "");

    const year = new Date().getFullYear();
    const prefix = type === "CFS" ? "VB/CFS" : "VB/EXP";
    const count = await VirtualBalanceModel.countDocuments({
      ...balanceFilter(req), referenceNo: new RegExp(`^${prefix}/${year}/`, "i"),
    });

    let nextSeq = count + 1;
    let referenceNo = `${prefix}/${year}/${String(nextSeq).padStart(4, "0")}`;

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

// PUT /api/virtual-balance/:id
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
        entry.partyName = cleanPartyName(req.body.partyName);
      }
    }

    if (amountPaid !== undefined) entry.amountPaid = amountPaid;
    if (utr !== undefined) entry.utr = utr;
    if (fromBank !== undefined) entry.fromBank = fromBank;
    if (remarks !== undefined) entry.remarks = remarks;
    if (fileUrl !== undefined) entry.fileUrl = fileUrl;
    if (req.body.bankAccountNo !== undefined) entry.bankAccountNo = req.body.bankAccountNo;
    if (req.body.bankName !== undefined) entry.bankName = req.body.bankName;
    if (req.body.bankIfsc !== undefined) entry.bankIfsc = req.body.bankIfsc;

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

// DELETE /api/virtual-balance/:id
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

// GET /api/virtual-balance/job-details/:jobNo
router.get(["/api/virtual-balance/job-details/:jobNo", "/api/cfs-virtual-balance/job-details/:jobNo"], async (req, res) => {
  try {
    const jobNo = req.params.jobNo ? req.params.jobNo.trim() : "";
    if (!jobNo) {
      return res.status(200).json({ success: true, partyName: "", branchCode: "", customHouse: "", mode: "", jobNo: "" });
    }

    const seqMatch = jobNo.match(/(?:^|\/|-)(\d{3,5})(?:\/|-|$)/) || jobNo.match(/\d+/);
    const conditions = [
      { job_no: { $regex: new RegExp(`^${escapeRegex(jobNo)}$`, "i") } },
      { jobNumber: { $regex: new RegExp(`^${escapeRegex(jobNo)}$`, "i") } },
      { custom_job_no: { $regex: new RegExp(`^${escapeRegex(jobNo)}$`, "i") } },
    ];
    if (seqMatch) {
      const seqNum = parseInt(seqMatch[1] || seqMatch[0], 10);
      const flexRegex = new RegExp(`(?:^|/|-)0*${seqNum}(?:/|-|$)`, "i");
      conditions.push({ job_no: { $regex: flexRegex } });
      conditions.push({ jobNumber: { $regex: flexRegex } });
    }

    const job = await ExJobModel.findOne({ $or: conditions })
      .select("job_no jobNumber custom_job_no exporter exporter_name name branch_code custom_house mode")
      .lean();

    if (!job) {
      return res.status(200).json({ success: true, partyName: "", branchCode: "", customHouse: "", mode: "", jobNo: jobNo });
    }

    res.status(200).json({
      success: true,
      jobNo: job.job_no || job.jobNumber || jobNo,
      partyName: job.exporter || job.exporter_name || job.name || "",
      branchCode: job.branch_code || "",
      customHouse: job.custom_house || "",
      mode: job.mode || "",
    });
  } catch (error) {
    console.error("Error fetching job details:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// GET /api/virtual-balance/job-purchase-books
router.get(["/api/virtual-balance/job-purchase-books", "/api/cfs-virtual-balance/job-purchase-books"], async (req, res) => {
  try {
    const { jobNo, cfsName } = req.query;

    if (!jobNo || !cfsName) {
      return res.status(400).json({ success: false, message: "Job No and CFS Name are required." });
    }

    const jobTokens = extractJobTokens(jobNo);
    const orConditions = [];

    jobTokens.forEach((jt) => {
      const escaped = escapeRegex(jt);
      orConditions.push({ jobNo: { $regex: new RegExp(escaped, "i") } });
      orConditions.push({ entryNo: { $regex: new RegExp(escaped, "i") } });
      const seqMatch = jt.match(/(?:^|\/|-)(\d{3,5})(?:\/|-|$)/) || jt.match(/\d+/);
      if (seqMatch) {
        const seqNum = parseInt(seqMatch[1] || seqMatch[0], 10);
        const flexRegex = new RegExp(`(?:^|/|-)0*${seqNum}(?:/|-|$)`, "i");
        orConditions.push({ jobNo: { $regex: flexRegex } });
        orConditions.push({ entryNo: { $regex: flexRegex } });
      }
    });

    const cfsRegex = new RegExp(`^${escapeRegex(cfsName.trim())}$`, "i");
    const type = getBalanceType(req);

    const purchaseBooks = await PurchaseBookEntryModel.find({
      $and: [
        { $or: orConditions.length > 0 ? orConditions : [{ jobNo: jobNo.trim() }] },
        {
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
        }
      ]
    }).lean();

    res.status(200).json({ success: true, data: purchaseBooks });
  } catch (error) {
    console.error("Error fetching comparison purchase books:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// GET /api/virtual-balance/jobs
router.get(["/api/virtual-balance/jobs", "/api/cfs-virtual-balance/jobs"], async (req, res) => {
  try {
    const { search = "" } = req.query;
    const trimmed = search.trim();
    let query = {};
    if (trimmed) {
      const regex = new RegExp(escapeRegex(trimmed), "i");
      query = {
        $or: [
          { job_no: regex },
          { jobNumber: regex },
          { branch_code: regex },
          { custom_house: regex },
          { mode: regex },
          { exporter: regex },
          { exporter_name: regex },
          { name: regex },
        ],
      };
    }
    const jobs = await ExJobModel.find(query)
      .select("job_no jobNumber exporter exporter_name name branch_code custom_house mode")
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();

    const data = jobs.map((j) => ({
      jobNo: j.job_no || j.jobNumber || "",
      jobSeq: j.job_no || "",
      partyName: j.exporter || j.exporter_name || j.name || "",
      branchCode: j.branch_code || "",
      customHouse: j.custom_house || "",
      mode: j.mode || "",
    }));
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("Error fetching jobs list:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// GET distinct terminal / cfs names that have virtual balance entries
router.get(
  [
    "/virtual-balance/created-terminals",
    "/api/virtual-balance/created-terminals",
    "/cfs-virtual-balance/created-names",
    "/api/cfs-virtual-balance/created-names",
    "/empty-yard-virtual-balance/created-names",
    "/api/empty-yard-virtual-balance/created-names",
  ],
  async (req, res) => {
    try {
      const distinctTerminals = await VirtualBalanceModel.distinct("cfsName", balanceFilter(req));
      const validTerminals = (distinctTerminals || [])
        .filter((t) => t && typeof t === "string" && t.trim() !== "")
        .map((t) => t.trim().toUpperCase())
        .sort();
      const unique = [...new Set(validTerminals)];
      res.status(200).json({ success: true, data: unique });
    } catch (error) {
      console.error("Error fetching created virtual balance terminals:", error);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  }
);

export default router;
