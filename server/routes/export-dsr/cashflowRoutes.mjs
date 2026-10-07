import express from "express";
import ExJobModel from "../../model/export/ExJobModel.mjs";
import {
  CashflowEntryModel,
  CashflowTeamMemberModel,
  DEFAULT_TEAM_MEMBERS,
} from "../../model/export/cashflowModel.mjs";
// No authMiddleware needed

const router = express.Router();

// Helper to ensure team members are seeded
async function getOrSeedTeamMembers() {
  let members = await CashflowTeamMemberModel.find({ isActive: true }).sort({ name: 1 }).lean();
  if (members.length === 0) {
    const seedDocs = DEFAULT_TEAM_MEMBERS.map((name) => ({ name, isActive: true }));
    try {
      await CashflowTeamMemberModel.insertMany(seedDocs, { ordered: false });
    } catch (e) {
      // ignore dupes on concurrent seed
    }
    members = await CashflowTeamMemberModel.find({ isActive: true }).sort({ name: 1 }).lean();
  }
  return members.map((m) => m.name);
}

// ----------------------------------------------------
// 1. GET /api/cashflow - Unified Cashflow Ledger
// ----------------------------------------------------
router.get("/api/cashflow", async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      expenseMadeBy,
      partyName,
      search,
    } = req.query;

    // A. Query automated cash charges from ExJobModel
    // Charges where cost.partyName is CASH (case-insensitive)
    const jobs = await ExJobModel.find(
      { "charges.cost.partyName": { $regex: /cash/i } },
      { job_no: 1, jobNumber: 1, custom_job_no: 1, exporter: 1, exporter_name: 1, charges: 1, createdAt: 1 }
    ).lean();

    const chargeRows = [];
    jobs.forEach((job) => {
      const jobCharges = job.charges || [];
      jobCharges.forEach((ch) => {
        const costParty = (ch.cost?.partyName || "").trim().toLowerCase();
        if (costParty.includes("cash")) {
          const expAmt = Number(
            ch.cost?.netPayable ?? ch.cost?.amountINR ?? ch.cost?.amount ?? 0
          );
          const revAmt = Number(ch.revenue?.amountINR ?? ch.revenue?.amount ?? 0);

          chargeRows.push({
            _id: ch._id ? String(ch._id) : `${job._id}_${chargeRows.length}`,
            source: "charge",
            jobId: job._id,
            postingDate: ch.createdAt || job.createdAt || new Date(),
            invoiceDate: ch.invoice_date || "",
            jobRefNo: job.job_no || job.jobNumber || job.custom_job_no || "",
            partyName: job.exporter || job.exporter_name || "",
            chargeHead: ch.chargeHead || "",
            particular: ch.chargeDescription || ch.cost?.chargeDescription || ch.remark || "",
            expAmount: expAmt,
            revenue: revAmt,
            cashWith: 0,
            expenseMadeBy: ch.cost?.expenseMadeBy || "",
            isBalanceAddition: false,
            remarks: ch.remark || "",
          });
        }
      });
    });

    // B. Query manual entries (balance additions + manual expenses)
    const manualEntries = await CashflowEntryModel.find().lean();
    const manualRows = manualEntries.map((entry) => {
      const isAdd = entry.entryType === "BALANCE_ADD";
      return {
        _id: String(entry._id),
        source: "manual",
        entryType: entry.entryType,
        postingDate: entry.postingDate || entry.createdAt || new Date(),
        invoiceDate: entry.invoiceDate || "",
        jobRefNo: entry.jobRefNo || (isAdd ? "CASH WITHDRAWAL FROM BANK" : ""),
        partyName: entry.partyName || "",
        chargeHead: entry.chargeHead || "",
        particular: entry.particular || (isAdd ? (entry.remarks || "CASH WITHDRAWAL FROM BANK") : ""),
        expAmount: isAdd ? 0 : Number(entry.amount || 0),
        revenue: Number(entry.revenue || 0),
        cashWith: isAdd ? Number(entry.amount || 0) : 0,
        expenseMadeBy: entry.expenseMadeBy || "",
        isBalanceAddition: isAdd,
        remarks: entry.remarks || "",
        createdByName: entry.createdByName || "",
      };
    });

    // Combine and sort chronologically by postingDate ascending
    const allRows = [...chargeRows, ...manualRows];
    allRows.sort((a, b) => new Date(a.postingDate) - new Date(b.postingDate));

    // Calculate running CASH BAL across entire history
    let runningBalance = 0;
    allRows.forEach((row) => {
      if (row.isBalanceAddition) {
        runningBalance += row.cashWith;
      } else {
        runningBalance -= row.expAmount;
      }
      row.cashBal = runningBalance;
    });

    let openingBalance = 0;
    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const priorRows = allRows.filter((r) => new Date(r.postingDate) < start);
      if (priorRows.length > 0) {
        openingBalance = priorRows[priorRows.length - 1].cashBal;
      }
    }

    // Apply Filters
    let filtered = allRows;

    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      filtered = filtered.filter((r) => new Date(r.postingDate) >= start);
    }

    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      filtered = filtered.filter((r) => new Date(r.postingDate) <= end);
    }

    if (expenseMadeBy && expenseMadeBy.trim() !== "" && expenseMadeBy !== "ALL") {
      const expByFilter = expenseMadeBy.trim().toUpperCase();
      filtered = filtered.filter(
        (r) => (r.expenseMadeBy || "").toUpperCase() === expByFilter
      );
    }

    if (partyName && partyName.trim() !== "") {
      const pFilter = partyName.trim().toUpperCase();
      filtered = filtered.filter((r) =>
        (r.partyName || "").toUpperCase().includes(pFilter)
      );
    }

    if (search && search.trim() !== "") {
      const q = search.trim().toUpperCase();
      filtered = filtered.filter(
        (r) =>
          (r.jobRefNo || "").toUpperCase().includes(q) ||
          (r.particular || "").toUpperCase().includes(q) ||
          (r.chargeHead || "").toUpperCase().includes(q) ||
          (r.partyName || "").toUpperCase().includes(q) ||
          (r.expenseMadeBy || "").toUpperCase().includes(q)
      );
    }

    // Calculate KPIs for filtered view
    let totalAddedBalance = 0;
    let totalExpense = 0;
    filtered.forEach((r) => {
      totalAddedBalance += r.cashWith || 0;
      totalExpense += r.expAmount || 0;
    });
    const netBalance = totalAddedBalance - totalExpense;
    const currentCashBalance = openingBalance + netBalance;

    const teamMembers = await getOrSeedTeamMembers();

    res.json({
      success: true,
      data: filtered,
      summary: {
        openingBalance,
        totalAddedBalance,
        totalExpense,
        netBalance,
        currentCashBalance,
      },
      teamMembers,
    });
  } catch (error) {
    console.error("Error in GET /api/cashflow:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ----------------------------------------------------
// 2. POST /api/cashflow/balance - Add Cash Withdrawal / Balance
// ----------------------------------------------------
router.post("/api/cashflow/balance", async (req, res) => {
  try {
    const {
      amount,
      postingDate,
      invoiceDate,
      jobRefNo = "CASH WITHDRAWAL FROM BANK",
      particular = "CASH WITHDRAWAL FROM BANK",
      remarks = "",
      expenseMadeBy = "",
    } = req.body;

    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      return res.status(400).json({ success: false, message: "Valid amount is required" });
    }

    const userName = req.user ? `${req.user.first_name || ""} ${req.user.last_name || ""}`.trim() : "";

    const newEntry = new CashflowEntryModel({
      entryType: "BALANCE_ADD",
      amount: Number(amount),
      postingDate: postingDate ? new Date(postingDate) : new Date(),
      invoiceDate: invoiceDate || "",
      jobRefNo: (jobRefNo || "CASH WITHDRAWAL FROM BANK").toUpperCase(),
      particular: particular || "CASH WITHDRAWAL FROM BANK",
      remarks,
      expenseMadeBy: (expenseMadeBy || "").toUpperCase(),
      createdBy: req.user?._id,
      createdByName: userName,
    });

    await newEntry.save();
    res.json({ success: true, data: newEntry });
  } catch (error) {
    console.error("Error in POST /api/cashflow/balance:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ----------------------------------------------------
// 3. POST /api/cashflow/expense - Add Manual Cash Expense
// ----------------------------------------------------
router.post("/api/cashflow/expense", async (req, res) => {
  try {
    const {
      amount,
      revenue = 0,
      postingDate,
      invoiceDate,
      jobRefNo = "",
      partyName = "",
      chargeHead = "MISCELLANEOUS EXP.",
      particular = "",
      expenseMadeBy = "",
      remarks = "",
    } = req.body;

    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      return res.status(400).json({ success: false, message: "Valid expense amount is required" });
    }

    const userName = req.user ? `${req.user.first_name || ""} ${req.user.last_name || ""}`.trim() : "";

    const newEntry = new CashflowEntryModel({
      entryType: "MANUAL_EXPENSE",
      amount: Number(amount),
      revenue: Number(revenue) || 0,
      postingDate: postingDate ? new Date(postingDate) : new Date(),
      invoiceDate: invoiceDate || "",
      jobRefNo: (jobRefNo || "").toUpperCase(),
      partyName: (partyName || "").toUpperCase(),
      chargeHead: (chargeHead || "MISCELLANEOUS EXP.").toUpperCase(),
      particular: particular || "",
      expenseMadeBy: (expenseMadeBy || "").toUpperCase(),
      remarks,
      createdBy: req.user?._id,
      createdByName: userName,
    });

    await newEntry.save();
    res.json({ success: true, data: newEntry });
  } catch (error) {
    console.error("Error in POST /api/cashflow/expense:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ----------------------------------------------------
// 4. DELETE /api/cashflow/:id - Delete Manual Entry
// ----------------------------------------------------
router.delete("/api/cashflow/:id", async (req, res) => {
  try {
    const entry = await CashflowEntryModel.findByIdAndDelete(req.params.id);
    if (!entry) {
      return res.status(404).json({ success: false, message: "Entry not found" });
    }
    res.json({ success: true, message: "Entry deleted successfully" });
  } catch (error) {
    console.error("Error in DELETE /api/cashflow/:id:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ----------------------------------------------------
// 5. Team Members API
// ----------------------------------------------------
router.get("/api/cashflow/team-members", async (req, res) => {
  try {
    const members = await getOrSeedTeamMembers();
    res.json({ success: true, data: members });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post("/api/cashflow/team-members", async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || typeof name !== "string" || name.trim() === "") {
      return res.status(400).json({ success: false, message: "Valid name is required" });
    }
    const cleanName = name.trim().toUpperCase();
    const existing = await CashflowTeamMemberModel.findOne({ name: cleanName });
    if (existing) {
      if (!existing.isActive) {
        existing.isActive = true;
        await existing.save();
      }
      const all = await getOrSeedTeamMembers();
      return res.json({ success: true, data: all });
    }

    await CashflowTeamMemberModel.create({ name: cleanName, isActive: true });
    const all = await getOrSeedTeamMembers();
    res.json({ success: true, data: all });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete("/api/cashflow/team-members/:name", async (req, res) => {
  try {
    const cleanName = decodeURIComponent(req.params.name).trim().toUpperCase();
    await CashflowTeamMemberModel.findOneAndDelete({ name: cleanName });
    const all = await getOrSeedTeamMembers();
    res.json({ success: true, data: all });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
