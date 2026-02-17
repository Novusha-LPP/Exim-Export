import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

// Create a separate connection for user database
const USER_MONGODB_URI = (() => {
  if (process.env.NODE_ENV === "production")
    return process.env.IMPORT_MONGODB_URI_PROD
  if (process.env.NODE_ENV === "server")
    return process.env.IMPORT_MONGODB_URI_SERVER
  return process.env.IMPORT_MONGODB_URI_DEV
})();

// Create dedicated connection for user database (fallbacks to main DB URIs if missing)
if (!USER_MONGODB_URI) {
  console.warn(
    "⚠️ USER_MONGODB_URI not defined. Falling back to server or dev DB to avoid crash."
  );
}
const actualUserDbUri = USER_MONGODB_URI
const userDbConnection = mongoose.createConnection(actualUserDbUri);

userDbConnection.on("connected", () => {
  console.log(
    "🟢 User Database connected to:",
    USER_MONGODB_URI || "User DB"
  );
});

userDbConnection.on("error", (err) => {
  console.error("❌ User Database connection error:", err);
});

const Schema = mongoose.Schema;

export const userSchema = new Schema({
  username: {
    type: String,
  },
  password: {
    type: String,
  },
  role: { type: String },

  modules: [
    {
      type: String,
    },
  ],
  assigned_importer_name: [
    {
      type: String,
    },
  ],
  assigned_importer: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Importer", // References the Importer model
    },
  ],
  ////////////////////////////////////////////////////////////////// Onboarding
  first_name: {
    type: String,
  },
  middle_name: {
    type: String,
  },
  last_name: {
    type: String,
  },
  company: {
    type: String,
  },
  email: {
    type: String,
  },
  employment_type: { type: String },
  skill: {
    type: String,
  },
  company_policy_visited: {
    type: String,
  },
  introduction_with_md: {
    type: String,
  },
  employee_photo: {
    type: String,
  },
  resume: { type: String },
  address_proof: { type: String },
  nda: { type: String },
  ////////////////////////////////////////////////////////////////// KYC
  designation: {
    type: String,
  },
  department: {
    type: String,
  },
  joining_date: {
    type: String,
  },
  date_of_birth: {
    type: String,
  },
  permanent_address_line_1: {
    type: String,
  },
  permanent_address_line_2: {
    type: String,
  },
  permanent_address_city: {
    type: String,
  },
  permanent_address_area: {
    type: String,
  },
  permanent_address_state: {
    type: String,
  },
  permanent_address_pincode: {
    type: String,
  },
  communication_address_line_1: {
    type: String,
  },
  communication_address_line_2: {
    type: String,
  },
  communication_address_city: {
    type: String,
  },
  communication_address_area: {
    type: String,
  },
  communication_address_state: {
    type: String,
  },
  communication_address_pincode: {
    type: String,
  },
  personal_email: {
    type: String,
  },
  official_email: {
    type: String,
  },
  dob: {
    type: String,
  },
  mobile: {
    type: String,
  },
  emergency_contact: {
    type: String,
  },
  emergency_contact_name: {
    type: String,
  },
  family_members: [
    {
      type: String,
    },
  ],
  close_friend_contact_no: {
    type: String,
  },
  close_friend_contact_name: {
    type: String,
  },
  blood_group: {
    type: String,
  },
  highest_qualification: {
    type: String,
  },
  aadhar_no: {
    type: String,
  },
  aadhar_photo_front: {
    type: String,
  },
  aadhar_photo_back: {
    type: String,
  },
  pan_no: {
    type: String,
  },
  pan_photo: {
    type: String,
  },
  pf_no: {
    type: String,
  },
  esic_no: {
    type: String,
  },
  insurance_status: [
    {
      type: String,
    },
  ],
  license_front: {
    type: String,
  },
  license_back: {
    type: String,
  },
  bank_account_no: {
    type: String,
  },
  bank_name: {
    type: String,
  },
  ifsc_code: {
    type: String,
  },
  favorite_song: {
    type: String,
  },
  marital_status: {
    type: String,
  },
  kyc_date: { type: String },
  kyc_approval: {
    type: String,
  },
  selected_icd_codes: [
    {
      type: String,
      trim: true,
    },
  ],
  selected_branches: [
    {
      type: String,
      trim: true,
    },
  ],
  selected_ports: [
    {
      type: String,
      trim: true,
    },
  ],
});

// Use the dedicated user database connection for the User model
const UserModel = userDbConnection.model("User", userSchema);
export default UserModel;
