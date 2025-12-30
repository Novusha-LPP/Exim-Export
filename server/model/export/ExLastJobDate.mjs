import mongoose from "mongoose";

const exJobsLastUpdatedOnSchema = new mongoose.Schema({
  date: {
    type: String,
    trim: true,
  },
});

const ExLastJobsDate = new mongoose.model(
  "ExJobsLastUpdated",
  exJobsLastUpdatedOnSchema
);

export default ExLastJobsDate;
