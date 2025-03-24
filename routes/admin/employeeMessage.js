const express = require("express");
const { query, param } = require("express-validator");
const EmployeeMessage = require("../../models/EmployeeMessage");
const Employee = require("../../models/Employee");
const authMiddleware = require("../../middleware/auth");
const { employeeMessageValidation } = require("../../utils/validation");
const {
  validateRequest,
  handleError,
  stripUnwantedFields,
  validateEmployeeBranchAssociation,
} = require("../../utils/helpers");
const messages = require("../../utils/messages");

const router = express.Router();

// @route   POST /admin/employee/message/branch/:branchId
// @desc    Send a message to an employee (Admin Only)
// @access  PRIVATE (Admin Only)
router.post(
  "/admin/employee/message/branch/:branchId",
  authMiddleware.authenticateJWT, // Authenticate JWT
  [
    param("branchId").isMongoId().withMessage(messages.INVALID_ID),
    ...employeeMessageValidation(),
  ], // Apply validation rules
  async (req, res) => {
    try {
      // Validate request body
      const errors = validateRequest(req);
      if (errors) return res.status(400).json({ errors });

      const { branchId } = req.params;

      // Validate that the employee is associated with the specified branch
      const validationResultSender = await validateEmployeeBranchAssociation(
        req.user.id, // Authenticated employee ID
        branchId // Branch ID from request params
      );

      if (!validationResultSender.isValid) {
        return res
          .status(
            validationResultSender.message === messages.FORBIDDEN ? 403 : 404
          )
          .json({ message: validationResultSender.message });
      }

      // Validate that the employee is associated with the specified branch
      const validationResultReceiver = await validateEmployeeBranchAssociation(
        req.body.receiverId, // Authenticated employee ID
        branchId // Branch ID from request params
      );

      if (!validationResultReceiver.isValid) {
        return res
          .status(
            validationResultReceiver.message === messages.FORBIDDEN ? 403 : 404
          )
          .json({ message: validationResultReceiver.message });
      }

      // Strip unwanted fields
      const filteredBody = stripUnwantedFields(
        req.body,
        EmployeeMessage.schema
      );

      const senderId = req.user.id;

      // Ensure sender and receiver are not the same
      if (senderId === filteredBody.receiverId) {
        return res.status(400).json({ message: messages.SAME_SENDER_RECEIVER });
      }

      // Add sender ID to the message
      filteredBody.senderId = senderId;

      //Add branchID to the message
      filteredBody.branchId = branchId;

      // Create and save the message
      const employeeMessage = new EmployeeMessage(filteredBody);
      await employeeMessage.save();

      // Emit the new message to the receiver's room via Socket.io
      const io = req.app.get("io");
      // io.to(filteredBody.receiverId).emit("newMessage", employeeMessage);
      io.emit("newMessage", employeeMessage);
      // Return success response
      res.status(201).json(employeeMessage);
    } catch (error) {
      handleError(
        `/admin/employee/message/branch/${req.params.branchId}`,
        "POST",
        error,
        req,
        res
      );
    }
  }
);

// @route   GET /admin/employee/messages/branch/:branchId
// @desc    Get messages between the current user and another employee (Admin Only)
// @access  PRIVATE (Admin Only)
router.get(
  "/admin/employee/messages/branch/:branchId",
  authMiddleware.authenticateJWT, // Authenticate JWT
  [
    query("employeeId").isMongoId().withMessage(messages.INVALID_ID),
    param("branchId").isMongoId().withMessage(messages.INVALID_ID),
  ], // Validate query parameter
  async (req, res) => {
    try {
      // Validate request query
      const errors = validateRequest(req);
      if (errors) return res.status(400).json({ errors });

      const { branchId } = req.params;

      const currentUserId = req.user.id;
      const otherEmployeeId = req.query.employeeId;

      // Validate that the employee is associated with the specified branch
      const validationResultSender = await validateEmployeeBranchAssociation(
        currentUserId, // Authenticated employee ID
        branchId // Branch ID from request params
      );

      if (!validationResultSender.isValid) {
        return res
          .status(
            validationResultSender.message === messages.FORBIDDEN ? 403 : 404
          )
          .json({ message: validationResultSender.message });
      }

      // Validate that the employee is associated with the specified branch
      const validationResultReceiver = await validateEmployeeBranchAssociation(
        otherEmployeeId, // Authenticated employee ID
        branchId // Branch ID from request params
      );

      if (!validationResultReceiver.isValid) {
        return res
          .status(
            validationResultReceiver.message === messages.FORBIDDEN ? 403 : 404
          )
          .json({ message: validationResultReceiver.message });
      }

      // Fetch messages between the current user and the other employee
      const employeeMessages = await EmployeeMessage.find({
        $or: [
          { senderId: currentUserId, receiverId: otherEmployeeId },
          { senderId: otherEmployeeId, receiverId: currentUserId },
        ],
      })
        .sort({ timestamp: 1 }) // Sort by timestamp in ascending order
        .lean();

      // Check if messages exist
      if (!employeeMessages.length) {
        return res.status(404).json({ message: messages.NO_MESSAGE_FOUND });
      }

      // Return success response with messages
      res.status(200).json(employeeMessages);
    } catch (error) {
      handleError(
        `/admin/employee/messages/branch/${req.params.branchId}`,
        "GET",
        error,
        req,
        res
      );
    }
  }
);

// @route   GET /admin/employee/messages/employees/branch/:branchId
// @desc    Get all employees who have messages in a specific branch (Admin Only)
// @access  PRIVATE (Admin Only)
router.get(
  "/admin/employee/messages/employees/branch/:branchId",
  authMiddleware.authenticateJWT, // Authenticate JWT
  [param("branchId").isMongoId().withMessage(messages.INVALID_ID)], // Validate query parameter
  async (req, res) => {
    try {
      // Validate request params
      const errors = validateRequest(req);
      if (errors) return res.status(400).json({ errors });

      const currentUserId = req.user.id;
      const branchId = req.params.branchId;

      // Validate that the authenticated employee is associated with the branch
      const validationResult = await validateEmployeeBranchAssociation(
        currentUserId,
        branchId
      );

      if (!validationResult.isValid) {
        return res
          .status(validationResult.message === messages.FORBIDDEN ? 403 : 404)
          .json({ message: validationResult.message });
      }

      // Find distinct employees who have sent or received messages within this branch
      const employeeIds = await EmployeeMessage.distinct("senderId", {
        branchId: branchId,
      }).lean();

      const receiverIds = await EmployeeMessage.distinct("receiverId", {
        branchId: branchId,
      }).lean();

      console.log(employeeIds);
      console.log(receiverIds);

      // Merge both sender and receiver IDs and remove duplicates
      const uniqueEmployeeIds = [...new Set([...employeeIds, ...receiverIds])];

      if (!uniqueEmployeeIds.length) {
        return res.status(404).json({ message: messages.NO_EMPLOYEES_FOUND });
      }

      // Fetch employee details
      const employees = await Employee.find({ _id: { $in: uniqueEmployeeIds } })
        .select("firstName lastName _id") // Select required fields
        .lean();

      // Return success response with employees
      res.status(200).json(employees);
    } catch (error) {
      handleError(
        `/admin/employee/messages/employees/branch/${req.params.branchId}`,
        "GET",
        error,
        req,
        res
      );
    }
  }
);

module.exports = router;
