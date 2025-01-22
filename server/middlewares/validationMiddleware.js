// middlwares/validationMiddleware.js
const logger = require("../utils/logger");
const { body, validationResult } = require("express-validator");

const validateSignupRules = [
    // Validate first_name
    body("first_name")
        .trim()
        .notEmpty()
        .withMessage("First name is required")
        .isAlpha()
        .withMessage("First name must only contain letters")
        .isLength({ max: 30 })
        .withMessage("First name cannot exceed 30 characters"),

    // Validate last_name
    body("last_name")
        .trim()
        .notEmpty()
        .withMessage("Last name is required")
        .isAlpha()
        .withMessage("Last name must only contain letters")
        .isLength({ max: 30 })
        .withMessage("Last name cannot exceed 30 characters"),

    // Validate email
    body("email")
        .trim()
        .notEmpty()
        .withMessage("Email is required")
        .isEmail()
        .withMessage("Invalid email format")
        .normalizeEmail(),

    // Validate password
    body("password")
        .notEmpty()
        .withMessage("Password is required")
        .isLength({ min: 6 })
        .withMessage("Password must be at least 6 characters long"),
    // .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
    // .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter')
    // .matches(/[0-9]/).withMessage('Password must contain at least one number')
    // .matches(/[\W_]/).withMessage('Password must contain at least one special character'),
    body("repeat_password")
        .notEmpty()
        .withMessage("Repeat password is required")
        .custom((value, { req }) => {
            if (value !== req.body.password) {
                throw new Error("Passwords do not match");
            }
            return true;
        }),
];

const handleValidationErrors = (request, response, next) => {
    const errors = validationResult(request);
    if (!errors.isEmpty()) {
        logger.error("Validation errors:", errors.array());
        return response.status(400).json({
            success: false,
            message: "Validation failed. Please check your input.",
            errors: errors.array(),
        });
    }
    // If no errors, proceed to the next middleware
    next();
};

module.exports = {
    validateSignupRules,
    handleValidationErrors,
};
