const { body, validationResult } = require("express-validator");
const httpMocks = require("node-mocks-http");
const logger = require("../utils/logger.js");

const {
    validateSignupRules,
    validationLoginRules,
    handleValidationErrors,
} = require("./validationMiddleware.js");

jest.mock("../utils/logger");
// Mock express-validator
jest.mock("express-validator", () => ({
    ...jest.requireActual("express-validator"),
    validationResult: jest.fn(),
}));

describe("Validation Middleware", () => {
    let req, res, next;

    beforeEach(() => {
        req = httpMocks.createRequest();
        res = httpMocks.createResponse();
        next = jest.fn();
    });

    describe("validateSignupRules", () => {
        it("should validate signup rules correctly", async () => {
            req.body = {
                first_name: "John",
                last_name: "Doe",
                email: "john.doe@example.com",
                password: "Password123",
                repeat_password: "Password123",
            };

            validationResult.mockReturnValue({
                isEmpty: () => true,
                array: () => [],
            });

            await Promise.all(
                validateSignupRules.map((validation) => validation.run(req))
            );
            const errors = validationResult(req);

            expect(errors.isEmpty()).toBe(true);
        });

        it("should return validation errors for invalid signup data", async () => {
            req.body = {
                first_name: "",
                last_name: "Doe123",
                email: "invalid-email",
                password: "1234",
                repeat_password: "1235",
            };

            validationResult.mockReturnValue({
                isEmpty: () => false,
                array: () => errors,
            });

            await Promise.all(
                validateSignupRules.map((validation) => validation.run(req))
            );

            const errors = [
                {
                    msg: "First name is required",
                    param: "first_name",
                    location: "body",
                },
                {
                    msg: "First name must only contain letters",
                    param: "first_name",
                    location: "body",
                },
                {
                    msg: "Last name must only contain letters",
                    param: "last_name",
                    location: "body",
                },
                {
                    msg: "Invalid email format",
                    param: "email",
                    location: "body",
                },
                {
                    msg: "Password must be at least 6 characters long",
                    param: "password",
                    location: "body",
                },
                {
                    msg: "Passwords do not match",
                    param: "repeat_password",
                    location: "body",
                },
            ];
            const result = validationResult(req);
            expect(result.isEmpty()).toBe(false);
            expect(result.array()).toHaveLength(6);
        });
    });

    describe("validationLoginRules", () => {
        it("should validate login rules correctly", async () => {
            req.body = {
                email: "john.doe@example.com",
                password: "Password123",
            };

            validationResult.mockReturnValue({
                isEmpty: () => true,
                array: () => [],
            });

            await Promise.all(
                validationLoginRules.map((validation) => validation.run(req))
            );
            const errors = validationResult(req);

            expect(errors.isEmpty()).toBe(true);
        });

        it("should return validation errors for invalid login data", async () => {
            req.body = {
                email: "invalid-email",
                password: "123",
            };

            const errors = [
                { msg: "Email is not valid", param: "email", location: "body" },
                {
                    msg: "Password must be at least 6 characters long",
                    param: "password",
                    location: "body",
                },
            ];
            validationResult.mockReturnValue({
                isEmpty: () => false,
                array: () => errors,
            });
            await Promise.all(
                validationLoginRules.map((validation) => validation.run(req))
            );
            const result = validationResult(req);
            expect(result.isEmpty()).toBe(false);
            expect(result.array()).toHaveLength(2);
        });
    });

    describe("handleValidationErrors", () => {
        it("should call next if no validation errors", () => {
            validationResult.mockReturnValue({ isEmpty: () => true });

            handleValidationErrors(req, res, next);

            expect(next).toHaveBeenCalled();
        });

        it("should return 400 if there are validation errors", () => {
            const errors = [
                { msg: "Error message", param: "field", location: "body" },
            ];
            validationResult.mockReturnValue({
                isEmpty: () => false,
                array: () => errors,
            });

            handleValidationErrors(req, res, next);

            expect(res.statusCode).toBe(400);
            expect(res._getJSONData()).toEqual({
                success: false,
                message: "Validation failed. Please check your input.",
                errors,
            });
            expect(logger.error).toHaveBeenCalledWith(
                `Validation errors: ${JSON.stringify(errors)}`
            );
            expect(next).not.toHaveBeenCalled();
        });
    });
});
