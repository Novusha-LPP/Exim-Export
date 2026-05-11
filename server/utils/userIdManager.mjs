import UserMappingModel from "../model/userMappingModel.mjs";
import crypto from "crypto";

/**
 * Get or create a unique user ID for a given username
 * This ensures each user has a consistent unique ID across all audit trails
 */
export async function getOrCreateUserId(username) {
  if (!username || username === 'unknown') {
    return 'UNKNOWN_USER';
  }

  try {
    // Use an atomic upsert to prevent race conditions that lead to duplicate key errors (E11000)
    // If it exists, it returns it and updates lastUsed.
    // If it doesn't exist, it creates it using setOnInsert to generate the mapping, but we don't
    // know the ID yet in the mongo query so we generate one ahead of time.
    
    // First, try to just find and update lastUsed (the fast, common path)
    let userMapping = await UserMappingModel.findOneAndUpdate(
      { username },
      { $set: { lastUsed: new Date() } },
      { new: true }
    );
    
    if (userMapping) {
      return userMapping.userId;
    }

    // If no mapping exists, create a new unique user ID and try to insert it (handling race conditions)
    const userId = generateUniqueUserId(username);
    
    try {
      userMapping = await UserMappingModel.findOneAndUpdate(
        { username },
        { 
          $setOnInsert: { username, userId },
          $set: { lastUsed: new Date() }
        },
        { new: true, upsert: true }
      );
      return userMapping.userId;
    } catch (err) {
      // If we STILL hit a duplicate key error due to a tight race condition where
      // the upsert collided, we can just fetch the one that won the race.
      if (err.code === 11000) {
         userMapping = await UserMappingModel.findOne({ username });
         if (userMapping) return userMapping.userId;
      }
      throw err;
    }

    
  } catch (error) {
    console.error('❌ Error getting/creating user ID:', error);
    // Fallback to a deterministic ID based on username
    return `USER_${username.toUpperCase().replace(/[^A-Z0-9]/g, '_')}`;
  }
}

/**
 * Generate a unique user ID based on username and timestamp
 */
function generateUniqueUserId(username) {
  // Create a deterministic but unique ID
  const timestamp = Date.now().toString(36); // Base36 timestamp
  const usernameHash = crypto.createHash('md5').update(username).digest('hex').substring(0, 6);
  
  return `USR_${username.substring(0, 8).toUpperCase()}_${usernameHash}_${timestamp}`;
}

/**
 * Get all user mappings (for admin purposes)
 */
export async function getAllUserMappings() {
  try {
    return await UserMappingModel.find().sort({ lastUsed: -1 });
  } catch (error) {
    console.error('❌ Error fetching user mappings:', error);
    return [];
  }
}

/**
 * Get username by user ID
 */
export async function getUsernameById(userId) {
  try {
    const mapping = await UserMappingModel.findOne({ userId });
    return mapping ? mapping.username : null;
  } catch (error) {
    console.error('❌ Error fetching username by ID:', error);
    return null;
  }
}
