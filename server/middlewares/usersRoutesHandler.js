// middlwares/usersRoutesHandler.js

const { hashPassword } = require("../utils/hashPass");
const logger = require("../utils/logger");
const loginCheck = require("../utils/loginCheck");
const {
    createUserQuery,
    getUserByIdQuery,
    getAllUsersQuery,
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

        const { password, user_role } = request.body;
        const hashed_password = await hashPassword(password);
        const newUser = await createUserQuery({
            ...request.body,
            hashed_password,
            user_role: user_role || "user", // Set user_role to "user" if it is not provided
        });
        logger.info(
            `New user created: user_id(${JSON.stringify(newUser.id)}) `
        ); // Log the new user

        response.status(201).json({
            success: true,
            message: "User created successfully",
            data: {
                id: newUser.id,
                email: newUser.email,
                role: newUser.user_role,
            },
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
            `User logged in successfully: user_id ${JSON.stringify(
                matchUser.id
            )} user_role ${JSON.stringify(matchUser.user_role)}`
        );
        request.session.user = {
            id: matchUser.id,
            email: matchUser.email,
            role: matchUser.user_role,
        };
        response.status(201).json({
            success: true,
            message: "login success",
            data: {
                id: matchUser.id,
                email: matchUser.email,
                role: matchUser.user_role,
            },
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
            response.clearCookie("sessionId"); // Clear the session cookie
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
        if (!user) {
            response
                .status(404)
                .json({ success: false, message: "User not found" });
            return;
        }
        logger.info(`User found by ID: ${JSON.stringify(user.id)}`); // Log the user object
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

const getAllProfiles = async (request, response, next) => {
    try {
        logger.info(
            `Incoming request to ${request.method} ${request.originalUrl}`
        ); // Log the request URL
        const users = await getAllUsersQuery();
        if (!users) {
            response
                .status(404)
                .json({ success: false, message: "No users retrieved" });
            return;
        }
        logger.info(
            `[usersRoutesHandler - getAllProfiles]: ${JSON.stringify(
                serializeUserInfo(users)
            )}`
        ); // Log the users array
        response.status(200).json({
            success: true,
            message: "Users found",
            data: users.map((user) => serializeUserInfo(user)),
        });
    } catch (error) {
        logger.error(
            `[usersRoutesHandler - getAllProfiles] => Error fetching users: ${error.message}`
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
        user_role: user.user_role,
        created_at: user.created_at,
    };
};

module.exports = {
    createUsers,
    userLogin,
    userLoggedOut,
    getUserInfo,
    getAllProfiles,
    // checkloggedIn,
};
