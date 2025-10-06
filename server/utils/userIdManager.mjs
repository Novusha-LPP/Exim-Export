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
    // First, try to find existing mapping
    let userMapping = await UserMappingModel.findOne({ username });
    
    if (userMapping) {
      // Update last used timestamp
      userMapping.lastUsed = new Date();
      await userMapping.save();
      return userMapping.userId;
    }
    
    // If no mapping exists, create a new unique user ID
    const userId = generateUniqueUserId(username);
    
    userMapping = new UserMappingModel({
      username,
      userId
    });
    
    await userMapping.save();    
    return userId;
    
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
