const mongoose = require("mongoose");
const { Schema } = mongoose;

const BranchSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    location: {
      address: { type: String, required: true, trim: true },
      latitude: { type: Number, required: true },
      longitude: { type: Number, required: true },
    },
    contactNumber: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { timestamps: true }
);

// Set virtuals to be included when converting documents to JSON or plain objects
BranchSchema.set("toJSON", { virtuals: true });
BranchSchema.set("toObject", { virtuals: true });

// Define a virtual field for employees.
// This assumes that the Employee model has a "branchId" field referencing the Branch.
BranchSchema.virtual("employees", {
  ref: "Employee", // The model to use
  localField: "_id", // Find employees where the Branch _id...
  foreignField: "branchId", // ...matches the employee's branchId
});

// Define a virtual field for orders.
// This assumes that the Order model has a "branchId" field referencing the Branch.
BranchSchema.virtual("orders", {
  ref: "Order",
  localField: "_id",
  foreignField: "branchId",
});

module.exports = mongoose.model("Branch", BranchSchema);
