const mongoose = require("mongoose");
const { Schema } = mongoose;

const BranchSchema = new Schema(
  {
    name: { type: String, required: true },
    location: {
      address: { type: String, required: true },
      latitude: { type: Number, required: true },
      longitude: { type: Number, required: true },
    },
    contactNumber: {
      type: String,
      required: true,
      match: /^\+?[1-9]\d{1,14}$/,
    },
    employees: [{ type: Schema.Types.ObjectId, ref: "Employee" }],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Branch", BranchSchema);
