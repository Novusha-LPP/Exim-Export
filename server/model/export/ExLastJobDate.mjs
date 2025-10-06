import mongoose from "mongoose";

const exJobsLastUpdatedOnSchema = new mongoose.Schema({
  date: {
    type: String,
    required: true,
    trim: true,
  },
});

const ExLastJobsDate = new mongoose.model(
  "ExJobsLastUpdated",
  exJobsLastUpdatedOnSchema
);

export default ExLastJobsDate;
