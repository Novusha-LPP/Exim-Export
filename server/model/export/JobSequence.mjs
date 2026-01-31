import mongoose from "mongoose";

const jobSequenceSchema = new mongoose.Schema({
    branch: {
        type: String,
        required: true,
        index: true,
    },
    year: {
        type: String, // format "YY-YY", e.g. "25-26"
        required: true,
        index: true,
    },
    lastSequence: {
        type: Number,
        required: true,
        default: 0,
    },
}, {
    timestamps: true
});

// Compound index to ensure uniqueness per branch + year
jobSequenceSchema.index({ branch: 1, year: 1 }, { unique: true });

const JobSequence = mongoose.model("JobSequence", jobSequenceSchema);

export default JobSequence;
