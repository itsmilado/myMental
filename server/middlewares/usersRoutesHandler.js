// middlwares/usersRoutesHandler.js

const { hashPassword } = require("../utils/hashPass");
const logger = require("../utils/logger");
const loginCheck = require("../utils/loginCheck");
const {
    createUserQuery,
    getUserByIdQuery,
    getUserByEmailQuery,
} = require("../db/usersQueries");

const createUsers = async (request, response, next) => {
    try {
        logger.info(
            `Incoming request to ${request.method} ${request.originalUrl}`
        ); // Log the request URL

        // Filter sensitive fields from the request body before logging
        const filteredBody = filterSensitiveFields(request.body, [
            "password",
            "repeat_password",
        ]);
        logger.info(`Request body: ${JSON.stringify(filteredBody)}`); // Log filtered body

        const { password } = request.body;
        const hashed_password = await hashPassword(password);
        const newUser = await createUserQuery({
            ...request.body,
            hashed_password,
        });
        logger.info(
            `New user created: user_id(${JSON.stringify(newUser.id)}) `
        ); // Log the new user

        response.status(201).json({
            success: true,
            message: "User created successfully",
            data: { id: newUser.id, email: newUser.email },
        });
    } catch (error) {
        logger.error(
            `[usersRoutesHandler > Line 15 - createUsers] => Error creating user: ${error.message}`
        );
        next(error);
    }
};

const userLogin = async (request, response, next) => {
    try {
        logger.info(
            `Incoming request to ${request.method} ${request.originalUrl}`
        ); // Log the request URL

        // Filter sensitive fields from the request body before logging
        const filteredBody = filterSensitiveFields(request.body, ["password"]);
        logger.info(`Request body: ${JSON.stringify(filteredBody)}`); // Log filtered body

        const matchUser = await loginCheck({ ...request.body });
        if (!matchUser) {
            logger.error(
                `[userHandlers > userLogin] User login failed: email or password is wrong!`
            );
            response.status(401).json({
                success: false,
                message: "Email or Password is wrong!",
            });
            return false; // Return false to exit the function
        }
        logger.info(
            `User logged in successfully: user_id(${JSON.stringify(
                matchUser.id
            )})`
        );
        request.session.user = {
            id: matchUser.id,
            email: matchUser.email,
        };
        response.status(201).json({
            success: true,
            message: "login success",
            data: { id: matchUser.id, email: matchUser.email },
        });
    } catch (error) {
        logger.error(`[userHandlers > userLogin] Error: ${error.message}`);
        next(error);
    }
};

const userLoggedOut = async (request, response, next) => {
    try {
        logger.info(
            `Incoming request to ${request.method} ${request.originalUrl}`
        );
        request.session.destroy((error) => {
            if (error) {
                logger.error(
                    `[userHandlers > userLoggedOut] Error destroying session: ${error.message}`
                );
                return next(error); // Pass the error to the error handler middleware
            }
            response.clearCookie("connect.sid"); // Clear the session cookie
            logger.info("Session cookie cleared");
            response
                .status(200)
                .json({ success: true, message: "logout successfull" });
        });
    } catch (error) {
        logger.error(`[userHandlers > userLoggedOut] Error: ${error.message}`);
        next(error);
    }
};

const getUserInfo = async (request, response, next) => {
    try {
        logger.info(
            `Incoming request to ${request.method} ${request.originalUrl}`
        ); // Log the request URL
        logger.info(`Request params: ${JSON.stringify(request.params)}`); // Log the request params

        const user = await getUserByIdQuery({ ...request.params });
        logger.info(`User found by ID: ${JSON.stringify(user.id)}`); // Log the user object
        if (!user) {
            response
                .status(404)
                .json({ success: false, message: "User not found" });
            return;
        }
        response.status(200).json({
            success: true,
            message: "User found",
            data: serializeUserInfo(user),
        });
    } catch (error) {
        logger.error(
            `[usersRoutesHandler > Line 38 - getUserInfo] => Error getting user info: ${error.message}`
        );
        next(error);
    }
};

// Helper function to filter sensitive fields
const filterSensitiveFields = (body, fieldsToHide) => {
    const filteredBody = { ...body };
    fieldsToHide.forEach((field) => {
        if (filteredBody[field]) {
            filteredBody[field] = "[FILTERED]";
        }
    });
    return filteredBody;
};

// Helper function to serialize user information for response
const serializeUserInfo = (user) => {
    return {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        isConfirmed: user.isConfirmed,
        created_at: user.created_at,
    };
};

module.exports = {
    createUsers,
    userLogin,
    userLoggedOut,
    getUserInfo,
    // checkloggedIn,
};
