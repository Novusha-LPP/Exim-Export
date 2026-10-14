# Enterprise Architecture & Development Safeguards Rule

All code created or modified in this repository MUST comply with the enterprise architecture rules defined in [DEVELOPMENT_SAFEGUARDS.md](file:///c:/Users/india/Desktop/projects/Exim-Export/DEVELOPMENT_SAFEGUARDS.md):

## 1. No Code Monoliths (Max 500 lines per file)
- Never create or expand files beyond 500 lines.
- Always decompose components into modular subcomponents (dialogs, widgets, hooks, and domain services).

## 2. Cryptographic Security & RBAC
- Never trust client-supplied identity headers (`username`, `user-role`, `x-username`, `x-user-role`).
- Always enforce JWT cryptographic verification via `authenticateToken` in `server/middleware/auth.mjs`.
- Always guard sensitive endpoints with `requireRole` or permission flags.
- Never commit `.env` or hardcode credentials in source code.

## 3. DoS & Memory Protection
- Never exceed 10MB JSON body limit in Express.
- Never use `multer.memoryStorage()`. Always use disk streaming (`multer.diskStorage()`) with automated file cleanup in a `finally` block.
- Enforce strict MIME type validation on all upload endpoints.
- Never run double-serialization (`JSON.stringify`) in response tracking middleware.
- Never run `nodemon` in production start scripts (`node app.js` only).

## 4. Query Safety & Database
- Always enforce pagination (`limit`, `skip`) on list queries.
- Always apply field projection (`.select()`) on high-volume queries to avoid over-fetching mega-documents.
- Use atomic MongoDB operators (`$set`, `$push`, `$pull`) instead of full-document array rewrites.

## 5. Frontend Architecture
- Register all Axios interceptors eagerly at module load time (`client/src/setupAxios.js`), NEVER inside React component `useEffect` hooks.
- Never wipe `localStorage` on generic HTTP errors.
- Never import backend Node.js packages (`aws-sdk`, `fs`, `pdf-parse`) in client code.
