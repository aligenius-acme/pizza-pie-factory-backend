const express = require("express");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const { param, query } = require("express-validator");
const Employee = require("../../models/Employee");
const Branch = require("../../models/Branch");
const authMiddleware = require("../../middleware/auth");
const { sendEmail } = require("../../utils/email");
const { sendSms } = require("../../utils/sms");
const { employeeValidation } = require("../../utils/validation");
const {
  generateToken,
  validateRequest,
  hashPassword,
  stripUnwantedFields,
  handleError,
  generateOTP,
} = require("../../utils/helpers");
const messages = require("../../utils/messages");
require("dotenv").config();

const router = express.Router();
const { FRONTEND_URL, PASSWORD_RESET_TOKEN_EXPIRY } = process.env;

// @route   POST /admin/employee/register
// @desc    Register a new employee (Admin Only)
// @access  PRIVATE (Admin Only)
router.post(
  "/admin/employee/register",
  authMiddleware.authenticateJWT,
  authMiddleware.authenticateAdmin,
  [employeeValidation.all()],
  async (req, res) => {
    try {
      const errors = validateRequest(req);
      if (errors) return res.status(400).json({ errors });

      // Strip unwanted fields
      const filteredBody = stripUnwantedFields(req.body, Employee.schema);

      // Verify that the branch exists
      const branch = await Branch.findById(filteredBody.branchId).lean();
      if (!branch) {
        return res.status(400).json({ message: messages.INVALID_BRANCH_ID });
      }

      // Check if an employee with the same email or phone already exists
      const existingEmployee = await Employee.findOne({
        $or: [{ email: filteredBody.email }, { phone: filteredBody.phone }],
      }).lean();

      if (existingEmployee) {
        return res.status(400).json({ message: messages.EMPLOYEE_EXISTS });
      }

      // Hash the password before saving
      filteredBody.password = await hashPassword(filteredBody.password);

      // Create and save the new employee
      const employee = new Employee(filteredBody);
      await employee.save();

      // Return success response with JWT token
      res.status(201).json({
        message: messages.REGISTRATION_SUCCESS,
        token: generateToken(employee._id, { role: employee.role }),
      });
    } catch (error) {
      handleError("/admin/employee/register", "POST", error, req, res);
    }
  }
);

// @route   PUT /admin/employee/update/:id
// @desc    Update an employee's details (Admin Only)
// @access  PRIVATE (Admin Only)
router.put(
  "/admin/employee/update/:id",
  authMiddleware.authenticateJWT,
  authMiddleware.authenticateAdmin,
  [
    param("id").isMongoId().withMessage(messages.INVALID_EMPLOYEE_ID),
    employeeValidation.all(),
  ],
  async (req, res) => {
    try {
      const errors = validateRequest(req);
      if (errors) return res.status(400).json({ errors });

      const { id } = req.params;

      // Strip unwanted fields
      const filteredBody = stripUnwantedFields(req.body, Employee.schema);

      // Check if another employee with the same email or phone already exists
      const existingEmployee = await Employee.findOne({
        $or: [{ email: filteredBody.email }, { phone: filteredBody.phone }],
        _id: { $ne: id }, // Exclude the current employee from the check
      }).lean();

      if (existingEmployee) {
        return res.status(400).json({ message: messages.EMPLOYEE_EXISTS });
      }

      // Verify that the branch exists
      const branch = await Branch.findById(filteredBody.branchId).lean();
      if (!branch) {
        return res.status(400).json({ message: messages.INVALID_BRANCH_ID });
      }

      // Find the employee by ID
      const employee = await Employee.findById(id).select("-password");
      if (!employee) {
        return res.status(404).json({ message: messages.EMPLOYEE_NOT_FOUND });
      }

      // Hash the new password if provided
      if (filteredBody.password) {
        filteredBody.password = await hashPassword(filteredBody.password);
      }

      // Update the employee's details
      Object.assign(employee, filteredBody);
      await employee.save();

      // Return success response with updated employee details
      res.status(200).json({
        message: messages.PROFILE_UPDATE_SUCCESS,
        employee,
      });
    } catch (error) {
      handleError(
        `/admin/employee/update/${req.params.id}`,
        "PUT",
        error,
        req,
        res
      );
    }
  }
);

// @route   POST /admin/employee/login
// @desc    Authenticate an employee and return a JWT token
// @access  PUBLIC
router.post(
  "/admin/employee/login",
  [employeeValidation.email, employeeValidation.password],
  async (req, res) => {
    try {
      const errors = validateRequest(req);
      if (errors) return res.status(400).json({ errors });

      const { email, password } = req.body;

      // Find the employee by email (without .lean())
      const employee = await Employee.findOne({ email }).select(
        "+otp +otpExpiry"
      );
      if (!employee) {
        return res.status(400).json({ message: messages.EMPLOYEE_NOT_FOUND });
      }

      // Check if employee is active
      if (employee.isActive === false) {
        return res.status(400).json({ message: messages.EMPLOYEE_NOT_ACTIVE });
      }

      // Compare the provided password with the hashed password
      const isPasswordValid = await bcrypt.compare(password, employee.password);
      if (!isPasswordValid) {
        return res.status(400).json({ message: messages.INVALID_CREDENTIALS });
      }

      // Return success response with JWT token
      res.status(200).json({
        message: messages.LOGIN_SUCCESS,
        token: generateToken(employee._id, { role: employee.role }),
      });

      /*
      // Generate and send OTP
      const otp = generateOTP();
      const otpExpiry = new Date(Date.now() + 5 * 60 * 1000); // OTP expires in 5 minutes

      // Save OTP and expiry time to the employee document
      employee.otp = otp;
      employee.otpExpiry = otpExpiry;
      await employee.save(); // Now this will work

      // Generate the OTP message using the OTP_MESSAGE function
      const otpMessage = messages.OTP_MESSAGE(otp, 5); // 5 minutes expiry

      // Send OTP via SMS
      await sendSms(employee.phone, otpMessage);

      // Return success response (OTP sent)
      res.status(200).json({
        message: messages.OTP_SENT,
        phone: employee.phone, // Return phone number for reference
      });
      */
    } catch (error) {
      handleError("/admin/employee/login", "POST", error, req, res);
    }
  }
);

// @route   POST /admin/employee/verify-otp
// @desc    Verify otp form MFA
// @access  PUBLIC
router.post("/admin/employee/verify-otp", async (req, res) => {
  try {
    const { phone, otp } = req.body;

    // Find the employee by phone number
    const employee = await Employee.findOne({ phone }).select(
      "+otp +otpExpiry"
    );
    if (!employee) {
      return res.status(400).json({ message: messages.EMPLOYEE_NOT_FOUND });
    }

    // Check if OTP matches and is not expired
    if (employee.otp !== otp || employee.otpExpiry < new Date()) {
      return res.status(400).json({ message: messages.INVALID_OTP });
    }

    // Clear OTP and expiry time after successful verification
    employee.otp = undefined;
    employee.otpExpiry = undefined;
    await employee.save();

    // Return success response with JWT token
    res.status(200).json({
      message: messages.LOGIN_SUCCESS,
      token: generateToken(employee._id, { role: employee.role }),
    });
  } catch (error) {
    handleError("/admin/employee/verify-otp", "POST", error, req, res);
  }
});

// @route   GET /admin/employee/get/:id
// @desc    Get an employee's details by ID
// @access  PRIVATE
router.get(
  "/admin/employee/get/:id",
  authMiddleware.authenticateJWT,
  authMiddleware.authenticateAdmin,
  [param("id").isMongoId().withMessage(messages.INVALID_EMPLOYEE_ID)],
  async (req, res) => {
    try {
      const errors = validateRequest(req);
      if (errors) return res.status(400).json({ errors });

      const { id } = req.params;

      // Find the employee by ID and exclude the password field
      const employee = await Employee.findById(id)
        .select("-password -resetPasswordToken -resetPasswordExpiry")
        .lean();
      if (!employee) {
        return res.status(404).json({ message: messages.EMPLOYEE_NOT_FOUND });
      }

      // Return success response with employee details
      res.status(200).json(employee);
    } catch (error) {
      handleError(
        `/admin/employee/get/${req.params.id}`,
        "GET",
        error,
        req,
        res
      );
    }
  }
);

// @route   GET /admin/employee/get
// @desc    Get logged in employee's details
// @access  PRIVATE
router.get(
  "/admin/employee/get",
  authMiddleware.authenticateJWT,
  async (req, res) => {
    try {
      const errors = validateRequest(req);
      if (errors) return res.status(400).json({ errors });

      const { id } = req.user.id;

      // Find the employee by ID and exclude the password field
      const employee = await Employee.findById(id)
        .select("-password -resetPasswordToken -resetPasswordExpiry")
        .lean();
      if (!employee) {
        return res.status(404).json({ message: messages.EMPLOYEE_NOT_FOUND });
      }

      // Return success response with employee details
      res.status(200).json(employee);
    } catch (error) {
      handleError(
        `/admin/employee/get/${req.params.id}`,
        "GET",
        error,
        req,
        res
      );
    }
  }
);

// @route   POST /admin/employee/forgot-password
// @desc    Initiate password reset process for an employee
// @access  PUBLIC
router.post(
  "/admin/employee/forgot-password",
  [employeeValidation.email],
  async (req, res) => {
    try {
      const errors = validateRequest(req);
      if (errors) return res.status(400).json({ errors });

      const { email } = req.body;

      // Find the employee by email
      const employee = await Employee.findOne({ email });
      if (!employee) {
        return res.status(400).json({ message: messages.EMPLOYEE_NOT_FOUND });
      }

      // Generate and save a reset token
      const resetToken = crypto.randomBytes(32).toString("hex");
      employee.resetPasswordToken = resetToken;
      employee.resetPasswordExpiry =
        Date.now() + (parseInt(PASSWORD_RESET_TOKEN_EXPIRY, 10) || 3600000); // Default to 1 hour
      await employee.save();

      // Create the reset link
      const resetLink = `${FRONTEND_URL}/employee/reset-password/${resetToken}`;

      // Send the reset email
      try {
        await sendEmail(
          email,
          messages.RESET_EMAIL_SUBJECT,
          messages.RESET_EMAIL_HTML(resetLink)
        );
      } catch (emailError) {
        return res.status(500).json({
          message: messages.RESET_EMAIL_FAILED,
          error: emailError.message,
        });
      }

      // Return success response
      res.status(200).json({ message: messages.RESET_EMAIL_SENT });
    } catch (error) {
      handleError("/admin/employee/forgot-password", "POST", error, req, res);
    }
  }
);

// @route   POST /admin/employee/reset-password/:token
// @desc    Reset an employee's password using a reset token
// @access  PUBLIC
router.post(
  "/admin/employee/reset-password/:token",
  [
    param("token").isString().withMessage(messages.INVALID_RESET_TOKEN),
    employeeValidation.password,
  ],
  async (req, res) => {
    try {
      const { token } = req.params;
      const { password } = req.body;

      // Validate request body
      const errors = validateRequest(req);
      if (errors) return res.status(400).json({ errors });

      // Find the employee by valid reset token
      const employee = await Employee.findOne({
        resetPasswordToken: token,
        resetPasswordExpiry: { $gt: Date.now() }, // Check if token is not expired
      });

      if (!employee) {
        return res.status(400).json({ message: messages.INVALID_RESET_TOKEN });
      }

      // Update the password and clear the reset token
      employee.password = await hashPassword(password);
      employee.resetPasswordToken = undefined;
      employee.resetPasswordExpiry = undefined;
      await employee.save();

      // Return success response
      res.status(200).json({ message: messages.PASSWORD_RESET_SUCCESS });
    } catch (error) {
      handleError("/admin/employee/reset-password", "POST", error, req, res);
    }
  }
);

// @route   GET /admin/employee/branch/:branchId
// @desc    Get all employees for a specific branch (with pagination, sorting, and filtering)
// @access  PRIVATE (Admin Only)
router.get(
  "/admin/employee/branch/:branchId",
  authMiddleware.authenticateJWT, // Authenticate JWT
  authMiddleware.authenticateAdmin, // Ensure user is an admin
  [
    param("branchId").isMongoId().withMessage(messages.INVALID_ID), // Validate branch ID
    query("page").optional().isInt({ min: 1 }).toInt(), // Validate page (optional)
    query("limit").optional().isInt({ min: 1 }).toInt(), // Validate limit (optional)
    query("sortBy").optional().isString(), // Validate sortBy (optional)
    query("order").optional().isIn(["asc", "desc"]), // Validate order (optional)
    query("role").optional().isString(), // Validate role (optional)
    query("isActive").optional().isBoolean(), // Validate active (optional)
    query("search").optional().isString(), // Validate search keyword (optional)
  ],
  async (req, res) => {
    try {
      // Validate request parameters and query
      const errors = validateRequest(req);
      if (errors) return res.status(400).json({ errors });

      const { branchId } = req.params;
      const {
        page = 1,
        limit = 10,
        sortBy = "createdAt",
        order = "desc",
        role, // Optional filtering by role
        isActive,
        search,
      } = req.query;

      const pageNumber = parseInt(page, 10);
      const pageSize = parseInt(limit, 10);
      const sortOrder = order === "asc" ? 1 : -1;

      // Build filter object
      let filter = { branchId: branchId };
      if (role) {
        filter.role = role; // Filter by role if provided
      }
      if (isActive !== undefined) {
        filter.isActive = isActive; // Filter by active status if provided
      }

      // Add search functionality
      if (search) {
        const searchRegex = new RegExp(search, "i"); // Case-insensitive search
        filter.$or = [
          { firstName: { $regex: searchRegex } }, // Search by first name
          { lastName: { $regex: searchRegex } }, // Search by last name
          { email: { $regex: searchRegex } }, // Search by email
        ];
      }

      // Find all employees for the branch with pagination and sorting
      const employees = await Employee.find(filter)
        .select("-password -resetPasswordToken -resetPasswordExpiry") // Exclude sensitive fields
        .sort({ [sortBy]: sortOrder }) // Sort by the specified field
        .skip((pageNumber - 1) * pageSize) // Skip records for pagination
        .limit(pageSize) // Limit the number of records per page
        .lean();

      if (!employees || employees.length === 0) {
        return res.status(404).json({ message: messages.NO_EMPLOYEES_FOUND });
      }

      // Get the total count of employees for the branch
      const totalCount = await Employee.countDocuments(filter);

      // Return success response with the employees and pagination details
      res.status(200).json({
        success: true,
        data: employees,
        pagination: {
          totalItems: totalCount,
          totalPages: Math.ceil(totalCount / pageSize),
          currentPage: pageNumber,
          pageSize,
        },
      });
    } catch (error) {
      handleError(
        `/admin/employee/branch/${req.params.branchId}`,
        "GET",
        error,
        req,
        res
      );
    }
  }
);

module.exports = router;
