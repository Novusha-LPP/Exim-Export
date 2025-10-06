import mongoose from "mongoose";

const Schema = mongoose.Schema;

const userSchema = new Schema({
  username: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  role: { type: String },

  transport_modules: [
    {
      type: String,
    },
  ],
  export_modules: [
    {
      type: String,
    },
  ],
  import_modules: [
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
});

const UserModel = mongoose.model("User", userSchema);
export default UserModel;
