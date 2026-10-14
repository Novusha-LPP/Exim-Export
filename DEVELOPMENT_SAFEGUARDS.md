# EXIM-Export: Enterprise Development Safeguards & Architecture Guidelines

**Document Version:** 1.0.0  
**Status:** Mandatory Engineering Standard  
**Audience:** All Developers, Architects, and AI Coding Assistants  

This document defines the strict architectural rules, security standards, and performance safeguards required for all new and refactored code across the **Exim-Export** platform. Every pull request and feature implementation must comply with these rules.

---

## 1. Core Architectural Tenets (Modularity & Clean Architecture)

### Rule 1.1: File Size & Complexity Limits (The "No Monoliths" Rule)
* **Maximum File Length:** No single code file may exceed **500 lines**. If a file approaches 400 lines, it must be proactively decomposed.
* **Component Splitting:**
  * Extract dialogs into dedicated `<Feature>Dialog.jsx` files.
  * Extract table columns, toolbars, and widgets into `<Feature>Widgets.jsx` files.
  * Extract complex state calculations into custom React hooks (`use<Feature>.js`).
* **Service-Layer Separation:**
  * Express route handlers must **never** contain hundreds of lines of inline business logic.
  * Routes must validate input, verify authentication/authorization, and delegate to domain services in `server/services/<domain>/`.

```
[Client / API Request]
       │
       ▼
[Route Controller]  ──► Input validation & RBAC check
       │
       ▼
[Domain Service]    ──► Business logic, calculations, audits
       │
       ▼
[Modular Schema]    ──► Atomic database updates & query projection
```

---

## 2. Security & Authentication Safeguards

### Rule 2.1: Cryptographic JWT Authentication is Mandatory
* **Never Trust Client Identity Headers:** Never read `username`, `x-username`, `user-role`, or `x-user-role` verbatim from incoming requests without cryptographic verification.
* **Global Authentication Enforcement:** All protected routes must pass through `server/middleware/auth.mjs` (`authenticateToken`).
* **Verified Claims Overwrite:** Verified JWT claims (`req.user.username`, `req.user.role`, `req.user._id`) are the **sole source of truth**.
* **Role-Based Access Control (RBAC):** Administrative or privileged actions must be explicitly guarded with `requireRole(['admin'])` or specific permission flags.

### Rule 2.2: Zero Plaintext Secrets in Code or Artifacts
* **No Hardcoded Credentials:** Never hardcode database URIs, API keys, passwords, or JWT secrets in code files.
* **Environment Isolation:** Secrets must be read exclusively from `process.env`.
* **Docker Hygiene:** Never include `COPY .env .env` in Docker build stages. Inject environment variables via container orchestration (Docker Compose, ECS, Kubernetes Secrets).
* **Git Hygiene:** `.env` and `*.pem` must remain permanently ignored in `.gitignore`.

### Rule 2.3: Strict Authorization on File & Destructive Operations
* File deletion endpoints (e.g., `/api/delete-s3-file`) must strictly enforce JWT authentication and verify that the requesting user has document deletion privileges (`canDeleteDocs === true` or role `Admin`).

---

## 3. Memory, I/O & Denial-of-Service (DoS) Safeguards

### Rule 3.1: Strict Payload Body Limits
* **Maximum JSON Payload:** `express.json({ limit: "10mb" })` is the absolute global ceiling.
* **Never set limits to 50MB or 100MB.** Large JSON strings block the single-threaded Node.js V8 event loop during `JSON.parse()`, causing full system starvation.

### Rule 3.2: Zero-Heap File Streaming (No In-Memory Buffers)
* **`multer.memoryStorage()` is BANNED.** Never buffer uploaded files directly into the Node.js RAM heap.
* **Disk Streaming Pipeline:** File uploads must use `multer.diskStorage()` targeting temporary disk storage (`os.tmpdir()/exim-uploads`), streamed directly to AWS S3 via read streams (`fs.createReadStream()`), and deleted immediately in a `finally` block:
  ```javascript
  // MANDATORY PATTERN for file uploads
  try {
    const fileStream = fs.createReadStream(file.path);
    await s3Client.send(new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: fileStream,
      ContentType: file.mimetype,
      ContentLength: fs.statSync(file.path).size,
    }));
  } finally {
    if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
  }
  ```
* **Strict MIME Validation:** Every file upload endpoint must enforce an explicit MIME type whitelist (reject executables, scripts, HTML, and unauthorized binaries).

### Rule 3.3: Zero Double-Serialization
* Middleware must **never** call `JSON.stringify(data)` on response payloads before Express serializes it.
* Measure response size by intercepting `res.send(body)` using `Buffer.byteLength(body)` on the already-serialized string/buffer.

### Rule 3.4: Production Process Entrypoint
* In production and inside Docker containers, execute using `node app.js`.
* `nodemon` is strictly a development file-watcher; it must **never** be used in production start scripts.

---

## 4. Database & Query Safety Safeguards (MongoDB & Mongoose)

### Rule 4.1: Mandatory Query Pagination
* **Never execute unbounded `.find({})` queries.** Unbounded reads of shipments or master directories consume excessive memory and crash the server.
* Always enforce pagination using `limit` (max 100–500 per page) and `skip`.

### Rule 4.2: Field Projections on High-Volume Queries
* The `ExJob` schema contains heavy nested structures (containers, invoices, tracking, documents).
* Tables and list views must explicitly select only the fields needed by the UI:
  ```javascript
  // CORRECT: Strict field projection
  await ExJobModel.find(query)
    .select("job_no exporter_name port_of_loading status createdAt")
    .limit(50)
    .lean();
  ```

### Rule 4.3: Modular Schema Architecture
* Never define mega-schemas in a single 2,000+ line file.
* Break schemas into modular sub-schemas (e.g. `operationsSchema.mjs`, `containersSchema.mjs`, `invoicesSchema.mjs`) imported into the main model.

### Rule 4.4: Atomic Array Updates
* Never fetch a full Mongoose document into memory, mutate a deeply nested array index in JavaScript (`doc.operations[0].milestones[2] = val`), and call `.save()`. This causes race conditions and subdocument overwrites.
* Use atomic MongoDB operators: `$set`, `$push`, `$pull`, `$addToSet` with positional filters (`$[elem]`).

---

## 5. Frontend Resilience & State Management Safeguards (React & Vite)

### Rule 5.1: Eager, Module-Level Axios Configuration
* **Never configure Axios interceptors inside React component `useEffect` hooks.** Child components mount and fire requests before parent effects run.
* All HTTP interceptors must reside in [`client/src/setupAxios.js`](file:///c:/Users/india/Desktop/projects/Exim-Export/client/src/setupAxios.js) and be imported at the very top of `main.jsx` before React renders.

### Rule 5.2: Graceful Session Lifecycle
* Never wipe `localStorage` on generic HTTP 401/500 errors.
* Only invalidate sessions when the server explicitly returns a confirmed token expiration message (`Invalid or expired token`).

### Rule 5.3: React Error Boundaries
* Wrap all primary feature pages, tables, and complex modal components in an `<ErrorBoundary>`.
* A runtime error or null property inside a single shipment row must **never** crash the entire application into a blank white screen.

### Rule 5.4: Client-Side Bundle Hygiene
* **Never import backend Node.js packages in the client bundle.** Packages like `aws-sdk`, `fs`, `pdf-parse`, and `@ilovepdf/ilovepdf-nodejs` belong strictly on the backend.
* Use lightweight browser-native utilities or dedicated client libraries.

---

## 6. Background Jobs & Worker Architecture

### Rule 6.1: Decoupled Scheduled Jobs & Worker Process
* Heavy recurring tasks (ICEGATE scraping, CONCOR container polling, daily DSR report generation) must **never** run inside the Express HTTP server process in production.
* Scheduled tasks must run inside the dedicated background worker process:
  ```bash
  # Start dedicated background worker
  npm run worker       # Production
  npm run worker:dev   # Development with file watching
  ```

### Rule 6.2: Mandatory Distributed Mutex Locking
* All cron jobs must be wrapped with `withDistributedLock("job_key", ttlMs, async () => { ... })` from [`server/utils/cronLock.mjs`](file:///c:/Users/india/Desktop/projects/Exim-Export/server/utils/cronLock.mjs).
* This guarantees that when running across multiple PM2 instances, Docker Swarm replicas, or Kubernetes pods, **only one instance acquires the lock and executes the task**. All other instances cleanly skip, preventing duplicate customer emails and external IP bans.

---

## 7. Developer Definition of Done (PR Checklist)

Before merging any new feature or refactoring existing code, verify the following:

- [ ] **Modularity:** No file modified or created exceeds 500 lines.
- [ ] **Security:** Endpoint is authenticated via `authenticateToken`; sensitive actions enforce `requireRole`.
- [ ] **No Client Header Trust:** User identity is retrieved exclusively from `req.user`.
- [ ] **Secrets:** No API keys, passwords, or database URIs are hardcoded.
- [ ] **Memory:** No `multer.memoryStorage()`; file uploads stream to disk/S3 and clean up in `finally`.
- [ ] **Payload Limits:** Body parsing limit is capped at $\le$ 10MB.
- [ ] **Database:** Queries enforce pagination and field projection (`.select()`).
- [ ] **Frontend:** HTTP requests go through the global Axios instance; components handle empty/null states safely.
- [ ] **Build Validation:** `npm run build` succeeds on both `client` and `server` with 0 errors.
