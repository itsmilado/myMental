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
        .withMessage("Invalid email format"),

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
        .custom((value, { req }) => value === req.body.password)
        .withMessage("Passwords do not match"),
];

const validationLoginRules = [
    // Validate email and password
    body("email")
        .trim()
        .notEmpty()
        .withMessage("Email is required")
        .isEmail()
        .withMessage("Invalid email format"),
    body("password")
        .notEmpty()
        .withMessage("Password is required")
        .isLength({ min: 6 })
        .withMessage("Password must be at least 6 characters long"),
];

const validateForgotPasswordRules = [
    body("email")
        .trim()
        .notEmpty()
        .withMessage("Email is required")
        .isEmail()
        .withMessage("Invalid email format"),
];

const validateResetPasswordRules = [
    body("token").trim().notEmpty().withMessage("Token is required"),
    body("new_password")
        .notEmpty()
        .withMessage("New password is required")
        .isLength({ min: 8 })
        .withMessage("Password must be at least 8 characters"),
];

/*
- purpose: stop request processing when express-validator returns validation errors
- inputs: express request, response, and next callback
- outputs: forwards to next middleware or returns 400 json response with validation details
- important behavior:
  - logs validation failures with request context
  - preserves the existing validation response payload
  - does not modify the validator error array before returning it
*/
const handleValidationErrors = (request, response, next) => {
    const errors = validationResult(request);

    if (!errors.isEmpty()) {
        logger.warn(
            `[validationMiddleware.handleValidationErrors] => validate request: failed | ${JSON.stringify(
                {
                    errorCount: errors.array().length,
                },
            )}`,
        );

        return response.status(400).json({
            success: false,
            message: "Validation failed. Please check your input.",
            errors: errors.array(),
        });
    }

    next();
};

module.exports = {
    validateSignupRules,
    validationLoginRules,
    validateForgotPasswordRules,
    handleValidationErrors,
    validateResetPasswordRules,
};
