import mongoose from "mongoose";

// Schema to maintain unique user IDs for audit trail
const userMappingSchema = new mongoose.Schema({
  username: { 
    type: String, 
    unique: true,
    index: true 
  },
  userId: { 
    type: String, 
    unique: true,
    index: true 
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastUsed: {
    type: Date,
    default: Date.now
  }
});

// Update lastUsed whenever accessed
userMappingSchema.pre('save', function(next) {
  this.lastUsed = new Date();
  next();
});

const UserMappingModel = mongoose.model("UserMapping", userMappingSchema);
export default UserMappingModel;
