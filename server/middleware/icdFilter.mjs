import UserModel from "../model/userModel.mjs";

/**
 * Middleware to apply ICD code filtering based on user permissions
 * This middleware will:
 * 1. Extract username from request (params.selectedICD first, then headers, body, or query)
 * 2. Fetch user's assigned ICD codes from database
 * 3. Apply automatic filtering based on user's ICD permissions
 * 4. Allow full access for admins or users with "ALL" ICD code
 */
const applyUserIcdFilter = async (req, res, next) => {
  try {
    // Extract username from various sources - prioritize params.username
    let username = 
      req.params?.username ||
      req.query?.username ||
      req.headers['x-username'] || 
      req.body?.username;

    // If no username provided, proceed without filtering (for backward compatibility)
    if (!username) {
      return next();
    }

    // Fetch user data from database
    const user = await UserModel.findOne({ username }).select('selected_icd_codes role');
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Admin users or users with "ALL" ICD code get full access
    if (user.role === "Admin" || 
        (user.selected_icd_codes && user.selected_icd_codes.includes("ALL"))) {
      // No ICD filtering needed for admins or users with ALL access
      req.userIcdFilter = null;
      req.icdFilterCondition = {}; // Empty object means no filtering
      return next();
    }

    // Apply ICD filtering for regular users
    if (user.selected_icd_codes && user.selected_icd_codes.length > 0) {
      // Create MongoDB query for ICD filtering - exact match with case insensitive
      const icdFilter = {
        custom_house: {
          $in: user.selected_icd_codes.map(icd => new RegExp(`^${escapeRegex(icd)}$`, 'i'))
        }
      };
      
      req.userIcdFilter = icdFilter; // For backward compatibility
      req.icdFilterCondition = icdFilter; // For new routes
      
   
    } else {
      // User has no ICD codes assigned - show no jobs
      const emptyFilter = { 
        custom_house: { $in: [] } // This will return no results
      };
      
      req.userIcdFilter = emptyFilter; // For backward compatibility
      req.icdFilterCondition = emptyFilter; // For new routes
      
    }

    // Store user info for potential use in route handlers
    req.currentUser = {
      username: user.username,
      role: user.role,
      selectedIcdCodes: user.selected_icd_codes || []
    };

    next();
  } catch (error) {
    console.error('Error in ICD filter middleware:', error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Helper function to escape regex special characters
const escapeRegex = (string) => {
  return string.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
};

export default applyUserIcdFilter;

// Named export for flexibility
export const icdFilter = applyUserIcdFilter;

/**
 * Middleware to apply Importer filtering based on user permissions
 * This middleware will:
 * 1. Extract username from request (params.username first, then headers, body, or query)
 * 2. Fetch user's assigned importers from database
 * 3. Apply automatic filtering based on user's importer permissions
 * 4. Allow full access for admins or users with "ALL" importer access
 */
// Helper function to escape special characters in regex
export const applyUserImporterFilter = async (req, res, next) => {
  try {
    let username =
      req.params?.username ||
      req.query?.username ||
      req.headers['x-username'] ||
      req.body?.username;

    if (!username) {
      return next();
    }

    // Fetch user data from database
    const user = await UserModel.findOne({ username }).select('assigned_importer_name role');

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Admin users get full access (no filtering)
    if (user.role === "Admin") {
      req.userImporterFilter = null;
      req.importerFilterCondition = {};
      return next();
    }

    // Check if user has assigned importers
    if (user.assigned_importer_name && user.assigned_importer_name.length > 0) {
      // Check if user has "ALL" access
      const hasAllAccess = user.assigned_importer_name.some(imp => 
        imp.toUpperCase() === "ALL"
      );

      if (hasAllAccess) {
        req.userImporterFilter = null;
        req.importerFilterCondition = {};
      } else {
        // Create filter for specific importers
        const importerFilter = {
          importer: {
            $in: user.assigned_importer_name.map(imp => 
              new RegExp(`^${escapeRegex(imp.trim())}$`, 'i')
            )
          }
        };
        req.userImporterFilter = importerFilter;
        req.importerFilterCondition = importerFilter;
      }
    } else {
      // User has no importers assigned - show no jobs
      const emptyFilter = {
        importer: { $in: [] }
      };
      req.userImporterFilter = emptyFilter;
      req.importerFilterCondition = emptyFilter;
    }

    // Store user info for potential use in route handlers
    req.currentUser = {
      ...(req.currentUser || {}),
      assignedImporterName: user.assigned_importer_name || [],
      role: user.role
    };

    next();
  } catch (error) {
    console.error('Error in Importer filter middleware:', error);
    res.status(500).json({ message: "Internal server error" });
  }
};
