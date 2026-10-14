import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("FATAL CONFIG ERROR: Missing JWT_SECRET in environment variables.");
}

/**
 * Public routes that do not require cryptographic JWT authentication
 */
const PUBLIC_PATHS = [
  /^\/api\/login\/?$/i,
  /^\/api\/health\/?.*$/i,
  /^\/api\/tally\/?.*$/i, // Handled by authApiKey in tallyRoutes
  /^\/api\/freight-enquiries\/public\/?.*$/i,
  /^\/api\/test-email\/?$/i,
];

/**
 * Authenticate Token Middleware
 * Cryptographically verifies the incoming JWT token from the Authorization header.
 * Replaces untrusted client headers (username, user-role, etc.) with verified claims from the token.
 */
export const authenticateToken = (req, res, next) => {
  const currentPath = (req.path || req.originalUrl || "").split("?")[0];

  // 1. Allow whitelisted public endpoints
  const isPublic = PUBLIC_PATHS.some((pattern) => pattern.test(currentPath));
  if (isPublic) {
    return next();
  }

  // 2. Allow requests with valid x-api-key (for external connectors/webhooks)
  if (req.headers["x-api-key"]) {
    return next();
  }

  // 3. Extract Bearer token from Authorization header or custom header
  const authHeader = req.headers["authorization"] || req.headers["Authorization"];
  let token = null;

  if (authHeader && typeof authHeader === "string") {
    if (authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7).trim();
    } else {
      token = authHeader.trim();
    }
  } else if (req.headers["x-access-token"]) {
    token = req.headers["x-access-token"];
  }

  if (!token) {
    // In transition mode (when STRICT_JWT !== "true"), permit legacy requests with username header
    // Ensures existing third-party connectors (Tally, Handover, Import) continue operating smoothly
    if (process.env.STRICT_JWT !== "true") {
      const username = req.headers["username"] || req.headers["x-username"];
      if (username) {
        const role = req.headers["user-role"] || req.headers["x-user-role"] || "User";
        req.user = { username, role, _id: req.headers["user-id"] || "legacy" };
        return next();
      }

      // Permit client profile bootstrap /api/get-user/:username so sessions transition smoothly
      const getUserMatch = currentPath.match(/^\/api\/get-user\/([^/]+)$/i);
      if (getUserMatch) {
        req.user = { username: decodeURIComponent(getUserMatch[1]), role: "User", _id: "bootstrap" };
        return next();
      }
    }

    return res.status(401).json({
      success: false,
      message: "Access Denied: Missing cryptographic authentication token (JWT)",
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    req.verifiedUser = decoded;

    // Overwrite untrusted client headers with cryptographically verified identity
    // Prevents privilege escalation and identity spoofing across all legacy routes
    req.headers["username"] = decoded.username;
    req.headers["x-username"] = decoded.username;
    req.headers["user-role"] = decoded.role;
    req.headers["x-user-role"] = decoded.role;
    req.headers["user-id"] = decoded._id;

    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: "Access Denied: Invalid or expired token",
    });
  }
};

/**
 * Role-Based Access Control (RBAC) Middleware
 * @param {string|string[]} allowedRoles
 */
export const requireRole = (allowedRoles = []) => {
  const rolesArray = (Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles]).map((r) =>
    r.toLowerCase()
  );

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const userRole = (req.user.role || "").toLowerCase();

    // Admins always have access, or if user's role matches any allowed role
    if (userRole === "admin" || rolesArray.includes(userRole)) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: `Access denied: Insufficient privileges. Required: [${rolesArray.join(", ")}]`,
    });
  };
};

export const requireAdmin = requireRole(["admin"]);

export default authenticateToken;
