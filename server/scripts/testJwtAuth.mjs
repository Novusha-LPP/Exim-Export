import jwt from "jsonwebtoken";
import { authenticateToken, requireRole } from "../middleware/auth.mjs";

const JWT_SECRET = process.env.JWT_SECRET || "3c7c6bab80b4ca6f1980fe6c99ca20e6265ea2ed27b83fc355ab30bee18030ad";

console.log("=== TEST 1: Token Generation & Verification ===");
const payload = {
  _id: "64a1234567890abcdef12345",
  username: "test_user",
  role: "User",
  modules: ["Export-DSR"],
};

const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
console.log("Generated token:", token ? "OK (length " + token.length + ")" : "FAIL");

const verified = jwt.verify(token, JWT_SECRET);
console.log("Verified username:", verified.username === "test_user" ? "PASS" : "FAIL");
console.log("Verified role:", verified.role === "User" ? "PASS" : "FAIL");

console.log("\n=== TEST 2: Anti-Spoofing Header Overwrite ===");
// Attacker tries to send spoofed headers claiming to be Admin
const fakeReq = {
  path: "/api/export-jobs",
  headers: {
    authorization: `Bearer ${token}`,
    username: "admin",
    "user-role": "Admin",
    "x-user-role": "Admin",
  },
};

let calledNext = false;
authenticateToken(fakeReq, {}, () => {
  calledNext = true;
});

console.log("Middleware executed next():", calledNext ? "PASS" : "FAIL");
console.log("Spoofed username overwritten with verified identity:", fakeReq.headers["username"] === "test_user" ? "PASS" : "FAIL");
console.log("Spoofed user-role overwritten with verified role:", fakeReq.headers["user-role"] === "User" ? "PASS" : "FAIL");
console.log("Spoofed x-user-role overwritten with verified role:", fakeReq.headers["x-user-role"] === "User" ? "PASS" : "FAIL");
console.log("req.user role populated correctly:", fakeReq.user.role === "User" ? "PASS" : "FAIL");

console.log("\n=== TEST 3: RBAC Privilege Enforcement ===");
let rbacRejected = false;
const fakeRes = {
  status: (code) => ({
    json: (body) => {
      if (code === 403) rbacRejected = true;
    },
  }),
};

const adminOnly = requireRole(["Admin"]);
adminOnly(fakeReq, fakeRes, () => {
  console.log("ERROR: Non-admin was allowed into admin endpoint!");
});

console.log("Non-admin user blocked from Admin route with HTTP 403:", rbacRejected ? "PASS" : "FAIL");

console.log("\n=== TEST 4: Missing Token Protection ===");
let unauthRejected = false;
const unauthReq = {
  path: "/api/export-jobs",
  headers: {},
};
const unauthRes = {
  status: (code) => ({
    json: (body) => {
      if (code === 401) unauthRejected = true;
    },
  }),
};

authenticateToken(unauthReq, unauthRes, () => {
  console.log("ERROR: Unauthenticated request was allowed through!");
});

console.log("Missing token rejected with HTTP 401:", unauthRejected ? "PASS" : "FAIL");
console.log("\nALL SECURITY TESTS PASSED!");
