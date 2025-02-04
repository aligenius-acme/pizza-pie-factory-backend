const mongoose = require("mongoose");

const BranchSchema = new mongoose.Schema(
  {
    branchId: { type: mongoose.Schema.Types.ObjectId, auto: true },
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
    employees: [{ type: mongoose.Schema.Types.ObjectId, ref: "Employee" }],
  },
  { timestamps: true }
);

module.exports = {
  Branch: mongoose.model("Branch", BranchSchema),
};
