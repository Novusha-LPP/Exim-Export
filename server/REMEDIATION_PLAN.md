# Production Remediation Implementation Plan

## 🚨 Post-Mortem: Retry Storm Incident (Dec 2025 - Jan 2026)

**Incident Duration:** 28 days
**Error Logs Generated:** 3.1 million
**MongoDB Data Transfer:** 1.8 TB
**Root Cause:** Disk I/O failure + No backoff + Dual logging to File + MongoDB

---

## 📋 Implementation Phases

### Phase 1: Critical Fixes (IMMEDIATE - Day 1)

#### 1.1 Replace Logger with Resilient Version

**Files Created:**
- ✅ `server/utils/resilientLogger.js` - Core utilities
- ✅ `server/logger.resilient.js` - Enhanced logger
- ✅ `server/exceptionHandlers.js` - Safe exception handlers

**Action Required:**

```javascript
// In server/app.js, replace line 7:
// OLD: import logger from "./logger.js";
// NEW:
import logger from "./logger.resilient.js";

// REMOVE lines 72-78 (old exception handlers)
// ADD at top of file (after imports):
import "./exceptionHandlers.js";
```

#### 1.2 Apply Query Safety Middleware

**File Created:**
- ✅ `server/middleware/querySafety.js`

**Action Required (server/app.js):**

```javascript
// Add after CORS middleware:
import { enforcePagination, trackResponseSize } from "./middleware/querySafety.js";

app.use(enforcePagination());
app.use(trackResponseSize(512 * 1024)); // Warn on 512KB responses
```

---

### Phase 2: Fix Dangerous Endpoints (Day 1-2)

#### 2.1 Fix getAllUsers.mjs

```javascript
// server/routes/getAllUsers.mjs
import express from "express";
import UserModel from "../model/userModel.mjs";

const router = express.Router();

// Safe projection for user list
const USER_LIST_PROJECTION = {
  _id: 1,
  username: 1,
  first_name: 1,
  last_name: 1,
  email: 1,
  role: 1,
  company: 1,
  modules: 1,
  selected_icd_code: 1
};

router.get("/api/get-all-users", async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const safeLimit = Math.min(parseInt(limit) || 50, 200);
    
    const [users, totalCount] = await Promise.all([
      UserModel.find({})
        .select(USER_LIST_PROJECTION)
        .skip(skip)
        .limit(safeLimit)
        .lean()
        .maxTimeMS(30000),
      UserModel.countDocuments({})
    ]);
    
    res.json({
      users,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / safeLimit),
        totalCount,
        hasNextPage: skip + safeLimit < totalCount
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
```

#### 2.2 Fix generateDSRReport.mjs (Line 22)

```javascript
// ADD LIMIT - server/routes/export-dsr/generateDSRReport.mjs
// Line 22 - Change from:
// const jobs = await ExportJob.find({ exporter: exporter })

// To:
const MAX_JOBS_FOR_REPORT = 1000; // Reasonable limit
const jobs = await ExportJob.find({ exporter: exporter })
  .sort({ createdAt: -1 })
  .limit(MAX_JOBS_FOR_REPORT)
  .lean();

// Also add pagination parameters to the API
// Add year filter to reduce dataset:
const { exporter, year } = req.query;
const filter = { exporter };
if (year) filter.year = year;

const jobs = await ExportJob.find(filter)
  .sort({ createdAt: -1 })
  .limit(MAX_JOBS_FOR_REPORT)
  .lean();
```

#### 2.3 Fix auditTrail.mjs (Line 82)

```javascript
// server/routes/audit/auditTrail.mjs - Line 82
// Change from:
// const allUsers = await UserModel.find({}).lean();

// To:
const allUsers = await UserModel.find({})
  .select({
    _id: 1,
    username: 1,
    first_name: 1,
    last_name: 1,
    email: 1,
    company: 1,
    role: 1,
    modules: 1
  })
  .lean()
  .maxTimeMS(15000);
```

---

### Phase 3: Add Health Monitoring (Day 2-3)

#### 3.1 Create Health Check Endpoint

```javascript
// server/routes/health.js
import express from "express";
import mongoose from "mongoose";
import { getExceptionHandlerStats } from "../exceptionHandlers.js";
import logger from "../logger.resilient.js";

const router = express.Router();

router.get("/health", async (req, res) => {
  const mongoStatus = mongoose.connection.readyState;
  const mongoLabels = {
    0: "disconnected",
    1: "connected",
    2: "connecting",
    3: "disconnecting"
  };
  
  const health = {
    status: mongoStatus === 1 ? "healthy" : "degraded",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    mongodb: {
      status: mongoLabels[mongoStatus],
      connected: mongoStatus === 1
    },
    logger: logger.getHealth(),
    errorStats: getExceptionHandlerStats()
  };
  
  const statusCode = health.status === "healthy" ? 200 : 503;
  res.status(statusCode).json(health);
});

router.get("/health/ready", (req, res) => {
  if (mongoose.connection.readyState === 1) {
    res.status(200).json({ ready: true });
  } else {
    res.status(503).json({ ready: false });
  }
});

export default router;
```

**Add to app.js:**
```javascript
import healthRoutes from "./routes/health.js";
app.use("/api", healthRoutes);
```

---

### Phase 4: Database Index Recommendations (Day 3)

Create indexes for commonly queried fields:

```javascript
// server/scripts/createIndexes.mjs
import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

const MONGODB_URI = process.env.PROD_MONGODB_URI || process.env.DEV_MONGODB_URI;

async function createIndexes() {
  await mongoose.connect(MONGODB_URI);
  
  const db = mongoose.connection.db;
  
  // Server Logs - Add TTL index for auto-cleanup
  await db.collection("serverlogs").createIndex(
    { timestamp: 1 },
    { expireAfterSeconds: 604800 } // 7 days TTL
  );
  
  // Export Jobs
  await db.collection("exportjobs").createIndex({ job_no: 1, year: 1 });
  await db.collection("exportjobs").createIndex({ exporter: 1, year: 1 });
  await db.collection("exportjobs").createIndex({ status: 1 });
  await db.collection("exportjobs").createIndex({ createdAt: -1 });
  
  // Audit Trail
  await db.collection("audittrails").createIndex({ timestamp: -1 });
  await db.collection("audittrails").createIndex({ username: 1, timestamp: -1 });
  await db.collection("audittrails").createIndex({ job_no: 1, year: 1 });
  await db.collection("audittrails").createIndex(
    { timestamp: 1 },
    { expireAfterSeconds: 7776000 } // 90 days TTL
  );
  
  console.log("✅ Indexes created successfully");
  await mongoose.disconnect();
}

createIndexes().catch(console.error);
```

---

### Phase 5: Cleanup Existing Logs (Day 3-4)

```javascript
// server/scripts/cleanupLogs.mjs
import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

const MONGODB_URI = process.env.PROD_MONGODB_URI;

async function cleanupLogs() {
  await mongoose.connect(MONGODB_URI);
  
  const db = mongoose.connection.db;
  
  // Count current logs
  const count = await db.collection("serverlogs").countDocuments();
  console.log(`Current log count: ${count}`);
  
  // Delete logs older than 7 days (keep recent for analysis)
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  
  const result = await db.collection("serverlogs").deleteMany({
    timestamp: { $lt: cutoff }
  });
  
  console.log(`Deleted ${result.deletedCount} old logs`);
  
  // Compact the collection
  await db.command({ compact: "serverlogs" });
  console.log("Collection compacted");
  
  await mongoose.disconnect();
}

cleanupLogs().catch(console.error);
```

---

## 📊 Monitoring Checklist

After implementation, monitor these metrics:

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| serverlogs collection size | < 100K docs | > 10K docs/hour |
| Error rate | < 10/min | > 100/min |
| MongoDB data transfer | < 1GB/day | > 10GB/day |
| Response time P99 | < 1s | > 5s |
| Circuit breaker trips | 0 | > 2/hour |

---

## 🔧 Quick Reference: Files Modified

| File | Status | Changes |
|------|--------|---------|
| `server/app.js` | NEEDS UPDATE | Remove old handlers, add imports |
| `server/logger.js` | KEEP AS BACKUP | Rename to `logger.original.js` |
| `server/routes/getAllUsers.mjs` | NEEDS UPDATE | Add pagination + projection |
| `server/routes/audit/auditTrail.mjs` | NEEDS UPDATE | Add projection on line 82 |
| `server/routes/export-dsr/generateDSRReport.mjs` | NEEDS UPDATE | Add limit on line 22 |

---

## 🚀 Deployment Steps

1. **Backup** current code
2. **Copy** new files to server
3. **Update** app.js imports
4. **Run** index creation script
5. **Deploy** to staging first
6. **Monitor** health endpoint
7. **If stable** deploy to production
8. **Run** log cleanup script

---

## 🎯 Success Criteria

A disk failure should now:
- ✅ Generate **1 summary log** instead of **3 million**
- ✅ Trigger circuit breaker within **5 failures**
- ✅ Fall back to **console-only logging**
- ✅ NOT write to MongoDB for infrastructure errors
- ✅ Apply **exponential backoff** between retries
- ✅ Trigger **graceful shutdown** if fatal loop detected

---

## 📞 Emergency Rollback

If issues occur after deployment:

```bash
# Restore original logger
mv server/logger.js server/logger.resilient.js
mv server/logger.original.js server/logger.js

# Restart server
pm2 restart all
```

---

*Document created: 2026-02-02*
*Incident period: 2025-12-20 to 2026-01-17*
