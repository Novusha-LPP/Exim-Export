import AuditTrailModel from "../model/auditTrailModel.mjs";
import mongoose from "mongoose";
import { getOrCreateUserId } from "../utils/userIdManager.mjs";
import ExJobModel from "../model/export/ExJobModel.mjs";
import Directory from "../model/Directorties/Directory.js";
import UserModel from "../model/userModel.mjs";

const documentTypeToModel = {
  Job: ExJobModel,
  ExportJob: ExJobModel,
  Directory: Directory,
  User: UserModel,
};
/**
 * Audit Trail Middleware
 * Tracks all changes made to database documents
 */

// Helper function to get nested value from object using dot notation
function getNestedValue(obj, path) {
  return path.split(".").reduce((current, key) => {
    if (current === null || current === undefined) return undefined;

    // Handle array indices
    if (!isNaN(key) && Array.isArray(current)) {
      return current[parseInt(key)];
    }

    return current[key];
  }, obj);
}

// Helper function to set nested value in object using dot notation
function setNestedValue(obj, path, value) {
  const keys = path.split(".");
  const lastKey = keys.pop();
  const target = keys.reduce((current, key) => {
    if (!isNaN(key) && Array.isArray(current)) {
      return current[parseInt(key)] || {};
    }
    return current[key] || {};
  }, obj);

  if (!isNaN(lastKey) && Array.isArray(target)) {
    target[parseInt(lastKey)] = value;
  } else {
    target[lastKey] = value;
  }
}

// Add this function before the findChanges function
function isOnlyDetailedStatusChange(oldDoc, newDoc) {
  if (!oldDoc || !newDoc) return false;

  // Create copies without the fields we want to ignore
  const fieldsToIgnore = ["detailed_status", "updatedAt", "__v"];

  function cleanDoc(doc) {
    const cleaned = JSON.parse(JSON.stringify(doc));
    fieldsToIgnore.forEach((field) => {
      delete cleaned[field];
    });
    return cleaned;
  }

  const cleanedOld = cleanDoc(oldDoc);
  const cleanedNew = cleanDoc(newDoc);

  return JSON.stringify(cleanedOld) === JSON.stringify(cleanedNew);
}
// Helper function to compare two objects and find differences
function findChanges(oldDoc, newDoc, parentPath = "", changes = []) {
  if (!oldDoc && !newDoc) return changes;

  // If one is null/undefined and other is not
  if (!oldDoc && newDoc) {
    // Skip detailed_status even for new additions
    if (
      parentPath === "detailed_status" ||
      parentPath.endsWith(".detailed_status")
    ) {
      return changes;
    }

    if (typeof newDoc === "object" && newDoc !== null) {
      if (Array.isArray(newDoc)) {
        newDoc.forEach((item, i) => {
          findChanges(undefined, item, parentPath ? `${parentPath}.${i}` : `${i}`, changes);
        });
      } else {
        Object.keys(newDoc).forEach((key) => {
          if (key.startsWith("_") || key === "__v" || key === "updatedAt") return;
          if (key === "detailed_status") return;
          findChanges(undefined, newDoc[key], parentPath ? `${parentPath}.${key}` : key, changes);
        });
      }
    } else {
      changes.push({
        field: parentPath.split(".").pop() || "document",
        fieldPath: parentPath,
        oldValue: null,
        newValue: newDoc,
        changeType: "ADDED",
      });
    }
    return changes;
  }

  if (oldDoc && !newDoc) {
    // Skip detailed_status even for removals
    if (
      parentPath === "detailed_status" ||
      parentPath.endsWith(".detailed_status")
    ) {
      return changes;
    }

    if (typeof oldDoc === "object" && oldDoc !== null) {
      if (Array.isArray(oldDoc)) {
        oldDoc.forEach((item, i) => {
          findChanges(item, undefined, parentPath ? `${parentPath}.${i}` : `${i}`, changes);
        });
      } else {
        Object.keys(oldDoc).forEach((key) => {
          if (key.startsWith("_") || key === "__v" || key === "updatedAt") return;
          if (key === "detailed_status") return;
          findChanges(oldDoc[key], undefined, parentPath ? `${parentPath}.${key}` : key, changes);
        });
      }
    } else {
      changes.push({
        field: parentPath.split(".").pop() || "document",
        fieldPath: parentPath,
        oldValue: oldDoc,
        newValue: null,
        changeType: "REMOVED",
      });
    }
    return changes;
  }

  // Handle arrays
  if (Array.isArray(oldDoc) && Array.isArray(newDoc)) {
    const maxLength = Math.max(oldDoc.length, newDoc.length);

    for (let i = 0; i < maxLength; i++) {
      const currentPath = parentPath ? `${parentPath}.${i}` : `${i}`;

      // Skip detailed_status in array paths
      if (
        currentPath.endsWith(".detailed_status") ||
        currentPath === "detailed_status"
      )
        continue;

      if (i >= oldDoc.length) {
        // New item added - recursively find all fields in the new item
        if (typeof newDoc[i] === "object" && newDoc[i] !== null && !Array.isArray(newDoc[i])) {
          // It's an object, drill down to individual fields
          findChanges(undefined, newDoc[i], currentPath, changes);
        } else {
          // It's a primitive or array, log it directly
          changes.push({
            field: currentPath,
            fieldPath: currentPath,
            oldValue: undefined,
            newValue: newDoc[i],
            changeType: "ADDED",
          });
        }
      } else if (i >= newDoc.length) {
        // Item removed - recursively find all fields in the removed item
        if (typeof oldDoc[i] === "object" && oldDoc[i] !== null && !Array.isArray(oldDoc[i])) {
          // It's an object, drill down to individual fields
          findChanges(oldDoc[i], undefined, currentPath, changes);
        } else {
          // It's a primitive or array, log it directly
          changes.push({
            field: currentPath,
            fieldPath: currentPath,
            oldValue: oldDoc[i],
            newValue: undefined,
            changeType: "REMOVED",
          });
        }
      } else {
        // Compare existing items
        findChanges(oldDoc[i], newDoc[i], currentPath, changes);
      }
    }

    return changes;
  }

  // Handle objects
  if (
    typeof oldDoc === "object" &&
    typeof newDoc === "object" &&
    oldDoc !== null &&
    newDoc !== null &&
    !Array.isArray(oldDoc) &&
    !Array.isArray(newDoc)
  ) {
    const allKeys = new Set([...Object.keys(oldDoc), ...Object.keys(newDoc)]);

    for (const key of allKeys) {
      // Skip mongoose internal fields
      if (key.startsWith("_") || key === "__v" || key === "updatedAt") continue;

      // Skip detailed_status field at any level - THIS IS THE KEY FIX
      if (key === "detailed_status") continue;

      const currentPath = parentPath ? `${parentPath}.${key}` : key;

      // Skip detailed_status in nested paths - ADDITIONAL SAFETY CHECK
      if (
        currentPath.endsWith(".detailed_status") ||
        currentPath === "detailed_status"
      )
        continue;

      const oldValue = oldDoc[key];
      const newValue = newDoc[key];

      if (oldValue === undefined && newValue !== undefined) {
        changes.push({
          field: key,
          fieldPath: currentPath,
          oldValue: undefined,
          newValue: newValue,
          changeType: "ADDED",
        });
      } else if (oldValue !== undefined && newValue === undefined) {
        changes.push({
          field: key,
          fieldPath: currentPath,
          oldValue: oldValue,
          newValue: undefined,
          changeType: "REMOVED",
        });
      } else if (oldValue !== newValue) {
        if (typeof oldValue === "object" || typeof newValue === "object") {
          findChanges(oldValue, newValue, currentPath, changes);
        } else {
          changes.push({
            field: key,
            fieldPath: currentPath,
            oldValue: oldValue,
            newValue: newValue,
            changeType: "MODIFIED",
          });
        }
      }
    }

    return changes;
  }

  // Handle primitive values
  if (oldDoc !== newDoc) {
    // Skip if the path is detailed_status - CRITICAL CHECK
    if (
      parentPath === "detailed_status" ||
      parentPath.endsWith(".detailed_status")
    ) {
      return changes; // Skip this change entirely
    }

    changes.push({
      field: parentPath.split(".").pop() || "value",
      fieldPath: parentPath,
      oldValue: oldDoc,
      newValue: newDoc,
      changeType: "MODIFIED",
    });
  }

  // Final comprehensive filter to catch any missed cases
  changes = changes.filter((change) => {
    const shouldSkip =
      change.field === "detailed_status" ||
      change.fieldPath === "detailed_status" ||
      change.fieldPath.endsWith(".detailed_status");
    return !shouldSkip;
  });

  return changes;
}
// Function to log audit trail
async function logAuditTrail({
  documentId,
  documentType,
  job_no,
  year,
  userId,
  username,
  userRole,
  action,
  changes,
  endpoint,
  method,
  ipAddress,
  userAgent,
  reason,
  sessionId,
}) {
  try {
    const auditEntry = new AuditTrailModel({
      documentId,
      documentType,
      job_no,
      year,
      userId,
      username,
      userRole,
      action,
      changes,
      endpoint,
      method,
      ipAddress,
      userAgent,
      reason,
      sessionId,
    });

    const savedEntry = await auditEntry.save();

    return savedEntry;
  } catch (error) {
    console.error("❌ Failed to log audit trail:", error);
    console.error("❌ Audit trail data that failed:", {
      documentId,
      documentType,
      job_no,
      year,
      userId,
      username,
      action,
      changesCount: changes?.length || 0,
      error: error.message,
    });
    throw error; // Re-throw to see the error in the calling function
  }
}

// Middleware for Express routes
export const auditMiddleware = (documentType = "Unknown") => {
  return async (req, res, next) => {
    // Store original document for comparison
    let originalDocument = null;
    let documentId = null;

    // Normalize headers to lowercase for case-insensitive access
    const normalizedHeaders = {};
    Object.keys(req.headers).forEach(key => {
      normalizedHeaders[key.toLowerCase()] = req.headers[key];
    });

    const userInfo = req.currentUser ||
      req.user || {
      _id: normalizedHeaders["user-id"] || req.body.userId || "unknown",
      username: normalizedHeaders["username"] || normalizedHeaders["x-username"] || req.body.username || "unknown",
      role: normalizedHeaders["user-role"] || normalizedHeaders["x-user-role"] || req.body.userRole || "unknown",
    };



    // Get or create unique user ID for this username
    const uniqueUserId = await getOrCreateUserId(userInfo.username);

    const user = {
      ...userInfo,
      uniqueUserId,
    };

    if (!user.uniqueUserId || user.uniqueUserId === "UNKNOWN_USER") {
      // console.warn(
      //   "⚠️ Audit middleware: Using fallback user ID for unknown user",
      //   {
      //     endpoint: req.originalUrl,
      //     username: userInfo.username,
      //     uniqueUserId: user.uniqueUserId
      //   }
      // );
    }

    // Extract document ID from params (common patterns)
    const id = req.params.id || req.params._id || req.params.documentId;
    let job_no = req.params.jobNo || req.params.job_no; // Support both jobNo and job_no
    let year = req.params.year || req.body.year; // Also check body for year

    // Check for pre-extracted job info first
    if (req.jobInfo && (documentType === "Job" || documentType === "ExportJob")) {
      job_no = req.jobInfo.job_no || job_no;
      year = req.jobInfo.year || year;
      documentId = req.jobInfo.documentId || documentId;
    }

    // For updates, we might have job_no in the body but not in params (though usually it's both)
    if (!job_no && req.body.job_no) job_no = req.body.job_no;

    const Model = documentTypeToModel[documentType];

    // Fetch original document
    if (job_no && (documentType === "Job" || documentType === "ExportJob")) {
      try {
        const query = { job_no };
        if (year) query.year = year;
        originalDocument = await ExJobModel.findOne(query).lean();
        if (originalDocument) {
          documentId = documentId || originalDocument._id;
          if (!year) year = originalDocument.year; // Ensure we have the year for later lookups
        }
      } catch (error) {
        console.error("❌ Error fetching original job document:", error);
      }
    } else if (id && mongoose.Types.ObjectId.isValid(id) && Model) {
      try {
        originalDocument = await Model.findById(id).lean();
        if (originalDocument) {
          documentId = originalDocument._id;
          if (documentType === "Job" || documentType === "ExportJob") {
            job_no = originalDocument.job_no;
            year = originalDocument.year;
          }
        }
      } catch (error) {
        console.error(`❌ Error fetching original ${documentType} document by ID:`, error);
      }
    } else if (id && mongoose.Types.ObjectId.isValid(id)) {
      documentId = new mongoose.Types.ObjectId(id);
    }

    // Override res.json to capture the response and log audit trail
    const originalJson = res.json;
    res.json = function (data) {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        // Handle different HTTP methods
        let action = "UPDATE";
        if (req.method === "POST") {
          action = (req.jobInfo || req.body._id || id) ? "UPDATE" : "CREATE";
        } else if (req.method === "DELETE") {
          action = "DELETE";
        } else if (req.method === "GET") {
          action = "VIEW";
        }

        setImmediate(async () => {
          try {
            // Check if job info was attached by a previous middleware
            if (req.jobInfo) {
              documentId = req.jobInfo.documentId;
              job_no = req.jobInfo.job_no;
              year = req.jobInfo.year;

              // Make sure we treat this as an UPDATE operation, not CREATE
              action = "UPDATE";

              // CRITICAL FIX: Add the detailed_status check to the req.jobInfo path
              if (action === "UPDATE" && originalDocument && documentId) {
                // Small delay to ensure database update is committed
                await new Promise((resolve) => setTimeout(resolve, 100));

                try {
                  let updatedDocument = null;

                  if (Model) {
                    if (documentId) {
                      updatedDocument = await Model.findById(documentId).lean();
                    } else if (job_no && (documentType === "Job" || documentType === "ExportJob")) {
                      const query = { job_no };
                      if (year) query.year = year;
                      updatedDocument = await ExJobModel.findOne(query).lean();
                    } else if (id && mongoose.Types.ObjectId.isValid(id)) {
                      updatedDocument = await Model.findById(id).lean();
                    }
                  }

                  if (updatedDocument) {
                    // FIRST: Check if only detailed_status and system fields changed
                    if (
                      isOnlyDetailedStatusChange(
                        originalDocument,
                        updatedDocument
                      )
                    ) {
                      return; // Exit early, don't create any audit record
                    }

                    // SECOND: If other changes exist, filter them and log
                    const changes = findChanges(
                      originalDocument,
                      updatedDocument
                    );

                    if (changes.length > 0) {
                      // Final safety check: ensure no detailed_status changes slipped through
                      const filteredChanges = changes.filter(
                        (change) =>
                          change.field !== "detailed_status" &&
                          change.fieldPath !== "detailed_status" &&
                          !change.fieldPath.endsWith(".detailed_status")
                      );

                      if (filteredChanges.length === 0) {

                        return;
                      }

                      await logAuditTrail({
                        documentId,
                        documentType,
                        job_no: job_no,
                        year: year,
                        userId: user.uniqueUserId,
                        username: user.username,
                        userRole: user.role,
                        action,
                        changes: filteredChanges,
                        endpoint: req.originalUrl,
                        method: req.method,
                        ipAddress: req.ip || req.connection.remoteAddress,
                        userAgent: req.get("User-Agent"),
                        reason: req.body.reason || req.query.reason,
                        sessionId: req.sessionID || req.session?.id,
                      });
                    } else {

                    }
                  } else {

                  }
                } catch (error) {
                  console.error(
                    "❌ [req.jobInfo path] Error in audit trail comparison:",
                    error
                  );
                }
              }
            }

            // For CREATE operations, get the created document info
            // Check if we have pre-extracted job info and should treat this as an UPDATE instead
            if (req.jobInfo && req.method === "POST") {
              action = "UPDATE";

              // Ensure we have documentId, job_no, and year from req.jobInfo
              if (!documentId) documentId = req.jobInfo.documentId;
              if (!job_no) job_no = req.jobInfo.job_no;
              if (!year) year = req.jobInfo.year;
            }

            if (action === "CREATE" && data) {
              // Handle different response structures
              let createdJob = null;
              let createdJobNo = null;
              let createdYear = null;
              let createdDocumentId = null;

              // For bulk operations like /api/jobs/add-job that return success message
              if (
                data.message &&
                data.message.includes("successfully") &&
                req.body &&
                Array.isArray(req.body)
              ) {
                // For bulk operations, we'll log a summary audit entry
                try {
                  const changes = [
                    {
                      field: "bulk_operation",
                      fieldPath: "",
                      oldValue: null,
                      newValue: `Bulk operation processed ${req.body.length} jobs`,
                      changeType: "BULK_OPERATION",
                    },
                  ];

                  // Log bulk operation audit
                  await logAuditTrail({
                    documentId: null, // No single document ID for bulk ops
                    documentType,
                    job_no: null, // No single job number for bulk ops
                    year: null, // No single year for bulk ops
                    userId: user.uniqueUserId,
                    username: user.username,
                    userRole: user.role,
                    action: "BULK_CREATE_UPDATE",
                    changes: changes,
                    endpoint: req.originalUrl,
                    method: req.method,
                    ipAddress: req.ip || req.connection.remoteAddress,
                    userAgent: req.get("User-Agent"),
                    sessionId: req.sessionID || req.session?.id,
                  });
                } catch (error) {
                  console.error(
                    "❌ Error logging bulk operation audit trail:",
                    error
                  );
                }

                return; // Early return for bulk operations
              }

              // Try to extract document info from response
              if (data._id) {
                createdDocumentId = data._id;
                if (documentType === "Job" || documentType === "ExportJob") {
                  createdJobNo = data.job_no;
                  createdYear = data.year;
                }
              } else if (data.job && data.job.job_no) {
                createdJobNo = data.job.job_no;
                createdYear = req.body.year;

                if (createdJobNo && createdYear && Model) {
                  try {
                    createdJob = await Model.findOne({
                      job_no: createdJobNo,
                      year: createdYear,
                    }).lean();
                    if (createdJob) {
                      createdDocumentId = createdJob._id;
                    }
                  } catch (error) {
                    console.error("❌ Error fetching created job for audit:", error);
                  }
                }
              } else if (data.data && data.data._id) {
                createdDocumentId = data.data._id;
                if (documentType === "Job" || documentType === "ExportJob") {
                  createdJobNo = data.data.job_no;
                  createdYear = data.data.year;
                }
              }

              if (createdDocumentId && Model) {
                // Get the created document to log detailed changes
                try {
                  const createdDoc = await Model.findById(
                    createdDocumentId
                  ).lean();

                  let changes = [];
                  if (createdDoc) {
                    // Log creation with key field information
                    changes = [
                      {
                        field: "document",
                        fieldPath: "",
                        oldValue: null,
                        newValue: `${documentType} created`,
                        changeType: "ADDED",
                      },
                    ];

                    if (documentType === "Job" || documentType === "ExportJob") {
                      if (createdDoc.job_no) {
                        changes.push({
                          field: "job_no",
                          fieldPath: "job_no",
                          oldValue: null,
                          newValue: createdDoc.job_no,
                          changeType: "ADDED",
                        });
                      }
                      if (createdDoc.year) {
                        changes.push({
                          field: "year",
                          fieldPath: "year",
                          oldValue: null,
                          newValue: createdDoc.year,
                          changeType: "ADDED",
                        });
                      }
                    }

                    // Add other important fields if they exist
                    if (createdDoc.organization) {
                      changes.push({
                        field: "organization",
                        fieldPath: "organization",
                        oldValue: null,
                        newValue: createdDoc.organization,
                        changeType: "ADDED",
                      });
                    }
                  }

                  // Log creation
                  await logAuditTrail({
                    documentId: createdDocumentId,
                    documentType,
                    job_no: createdJobNo,
                    year: createdYear,
                    userId: user.uniqueUserId,
                    username: user.username,
                    userRole: user.role,
                    action,
                    changes: changes,
                    endpoint: req.originalUrl,
                    method: req.method,
                    ipAddress: req.ip || req.connection.remoteAddress,
                    userAgent: req.get("User-Agent"),
                    sessionId: req.sessionID || req.session?.id,
                  });
                } catch (error) {
                  console.error("❌ Error logging CREATE audit trail:", error);
                }
              } else {

              }
            }

            // For UPDATE operations, compare changes (GENERAL PATH - not req.jobInfo)
            if (
              action === "UPDATE" &&
              originalDocument &&
              documentId &&
              !req.jobInfo
            ) {
              // Small delay to ensure database update is committed
              await new Promise((resolve) => setTimeout(resolve, 100));
              try {
                let updatedDocument = null;
                if (Model && (documentType === "Job" || documentType === "ExportJob")) {
                  const pipeline = [
                    { $match: { _id: documentId } },
                    {
                      $project: {
                        detailed_status: 0,
                        updatedAt: 0,
                        __v: 0,
                      },
                    },
                  ];
                  const [aggDoc] = await Model.aggregate(pipeline);
                  updatedDocument = aggDoc;
                  const {
                    detailed_status,
                    updatedAt,
                    __v,
                    ...origDocFiltered
                  } = originalDocument || {};
                  if (
                    JSON.stringify(origDocFiltered) ===
                    JSON.stringify(updatedDocument)
                  ) {
                    return;
                  }
                } else if (Model) {
                  updatedDocument = await Model.findById(
                    documentId
                  ).lean();
                  if (
                    isOnlyDetailedStatusChange(
                      originalDocument,
                      updatedDocument
                    )
                  ) {
                    return;
                  }
                }
                // SECOND: If other changes exist, filter them and log
                const changes = findChanges(originalDocument, updatedDocument);
                if (changes.length > 0) {


                  // Final safety check: ensure no detailed_status changes slipped through
                  const filteredChanges = changes.filter(
                    (change) => !change.fieldPath.includes("detailed_status")
                  );
                  if (filteredChanges.length === 0) {

                    return;
                  }
                  await logAuditTrail({
                    documentId,
                    documentType,
                    job_no: job_no,
                    year: year,
                    userId: user.uniqueUserId,
                    username: user.username,
                    userRole: user.role,
                    action,
                    changes: filteredChanges,
                    endpoint: req.originalUrl,
                    method: req.method,
                    ipAddress: req.ip || req.connection.remoteAddress,
                    userAgent: req.get("User-Agent"),
                    reason: req.body.reason || req.query.reason,
                    sessionId: req.sessionID || req.session?.id,
                  });
                } else {

                }
              } catch (error) {
                console.error(
                  "❌ [General path] Error in audit trail comparison:",
                  error
                );
              }
            }

            // For DELETE operations
            if (action === "DELETE" && originalDocument && documentId) {
              await logAuditTrail({
                documentId,
                documentType,
                job_no: job_no,
                year: year,
                userId: user.uniqueUserId,
                username: user.username,
                userRole: user.role,
                action,
                changes: [
                  {
                    field: "document",
                    fieldPath: "",
                    oldValue: "Document existed",
                    newValue: null,
                    changeType: "REMOVED",
                  },
                ],
                endpoint: req.originalUrl,
                method: req.method,
                ipAddress: req.ip || req.connection.remoteAddress,
                userAgent: req.get("User-Agent"),
                sessionId: req.sessionID || req.session?.id,
              });
            }
          } catch (error) {
            console.error("❌ Error in audit trail logging:", error);
          }
        });
      }

      return originalJson.call(this, data);
    };

    next();
  };
};

// export { auditMiddleware };
export default auditMiddleware;
