// middlwares/usersRoutesHandler.js

const { hashPassword } = require("../utils/hashPass");
const logger = require("../utils/logger");
const loginCheck = require("../utils/loginCheck");
const {
    createUserQuery,
    getUserByIdQuery,
    getAllUsersQuery,
    getUserByEmailQuery,
    updateUserByIdQuery,
} = require("../db/usersQueries");
const { request } = require("express");
const { log } = require("winston");

const createUsers = async (request, response, next) => {
    try {
        logger.info(
            `Incoming request to ${request.method} ${request.originalUrl}`,
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
            `New user created: user_id(${JSON.stringify(newUser.id)}) `,
        ); // Log the new user

        response.status(201).json({
            success: true,
            message: "User created successfully",
            userData: {
                id: newUser.id,
                first_name: newUser.first_name,
                last_name: newUser.last_name,
                email: newUser.email,
                role: newUser.user_role,
                created_at: newUser.created_at,
            },
        });
    } catch (error) {
        logger.error(
            `[usersRoutesHandler > Line 15 - createUsers] => Error creating user: ${error.message}`,
        );
        next(error);
    }
};

const userLogin = async (request, response, next) => {
    try {
        logger.info(
            `Incoming request to ${request.method} ${request.originalUrl}`,
        ); // Log the request URL

        // Filter sensitive fields from the request body before logging
        const filteredBody = filterSensitiveFields(request.body, ["password"]);
        logger.info(`Request body: ${JSON.stringify(filteredBody)}`); // Log filtered body

        const matchUser = await loginCheck({ ...request.body });
        if (!matchUser) {
            logger.error(
                `[userHandlers > userLogin] User login failed: email or password is wrong!`,
            );
            response.status(401).json({
                success: false,
                message: "Email or Password is wrong!",
            });
            return false; // Return false to exit the function
        }
        logger.info(
            `User logged in successfully: user_id ${JSON.stringify(
                matchUser.id,
            )} user_role ${JSON.stringify(matchUser.user_role)}`,
        );
        request.session.user = {
            id: matchUser.id,
            email: matchUser.email,
            role: matchUser.user_role,
        };
        response.status(201).json({
            success: true,
            message: "login success",
            userData: {
                id: matchUser.id,
                first_name: matchUser.first_name,
                last_name: matchUser.last_name,
                email: matchUser.email,
                role: matchUser.user_role,
                created_at: matchUser.created_at,
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
            `Incoming request to ${request.method} ${request.originalUrl}`,
        );
        request.session.destroy((error) => {
            if (error) {
                logger.error(
                    `[userHandlers > userLoggedOut] Error destroying session: ${error.message}`,
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
            `Incoming request to ${request.method} ${request.originalUrl}`,
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
            `[usersRoutesHandler > Line 38 - getUserInfo] => Error getting user info: ${error.message}`,
        );
        next(error);
    }
};

const getAllProfiles = async (request, response, next) => {
    try {
        logger.info(
            `Incoming request to ${request.method} ${request.originalUrl}`,
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
                serializeUserInfo(users),
            )}`,
        ); // Log the users array
        response.status(200).json({
            success: true,
            message: "Users found",
            data: users.map((user) => serializeUserInfo(user)),
        });
    } catch (error) {
        logger.error(
            `[usersRoutesHandler - getAllProfiles] => Error fetching users: ${error.message}`,
        );
        next(error);
    }
};

const getCurrentUser = async (request, response, next) => {
    try {
        logger.info(
            `Incoming request to ${request.method} ${request.originalUrl}`,
        );

        // Check if there is a user in the session
        if (!request.session || !request.session.user) {
            return response.status(401).json({
                success: false,
                message: "Not authenticated",
            });
        }

        const { id } = request.session.user;

        const user = await getUserByIdQuery({ id });
        if (!user) {
            return response.status(404).json({
                success: false,
                message: "User not found",
            });
        }
        logger.info(`User is Logged-in with id : ${id} `);
        const userData = serializeUserInfo(user);

        return response.status(200).json({
            success: true,
            message: "User is authenticated",
            userData,
        });
    } catch (error) {
        logger.error(
            `[usersRoutesHandler > getCurrentUser] => Error getting current user: ${error.message}`,
        );
        next(error);
    }
};

const updateCurrentUser = async (request, response, next) => {
    try {
        logger.info(
            `Incoming request to ${request.method} ${request.originalUrl}`,
        );

        if (!request.session || !request.session.user) {
            return response.status(401).json({
                success: false,
                message: "Not authenticated",
            });
        }

        const { id } = request.session.user;

        const { first_name, last_name, email } = request.body || {};

        if (
            first_name === undefined &&
            last_name === undefined &&
            email === undefined
        ) {
            return response.status(400).json({
                success: false,
                message: "No fields provided to update",
            });
        }

        if (first_name !== undefined && !isValidName(first_name)) {
            return response.status(400).json({
                success: false,
                message: "Invalid first name",
            });
        }

        if (last_name !== undefined && !isValidName(last_name)) {
            return response.status(400).json({
                success: false,
                message: "Invalid last name",
            });
        }

        if (email !== undefined && !isValidEmail(email)) {
            return response.status(400).json({
                success: false,
                message: "Invalid email",
            });
        }

        // Email uniqueness check (only if changing email)
        if (email !== undefined) {
            const existing = await getUserByEmailQuery({ email: email.trim() });
            // Only return error if email exists and belongs to a different user
            if (existing && String(existing.id) !== String(id)) {
                logger.warn(`Email already in use by another user: ${email}`);
                return response.status(409).json({
                    success: false,
                    message: "Email already in use",
                });
            }
        }

        const updatedUser = await updateUserByIdQuery({
            id,
            first_name: first_name?.trim(),
            last_name: last_name?.trim(),
            email: email?.trim(),
        });

        if (!updatedUser) {
            return response.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        const userData = serializeUserInfo(updatedUser);

        // Keep session email in sync (prevents stale session display)
        request.session.user.email = userData.email;

        return response.status(200).json({
            success: true,
            message: "Profile updated",
            userData,
        });
    } catch (error) {
        logger.error(
            `[usersRoutesHandler > updateCurrentUser] => Error updating current user: ${error.message}`,
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

const isValidName = (value) => {
    if (typeof value !== "string") return false;
    const v = value.trim();
    if (v.length < 1 || v.length > 30) return false;
    // allow letters + spaces + hyphen
    return /^[A-Za-zÀ-ÖØ-öø-ÿ -]+$/.test(v);
};

const isValidEmail = (value) => {
    if (typeof value !== "string") return false;
    const v = value.trim();
    if (v.length < 3 || v.length > 254) return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
};

module.exports = {
    createUsers,
    userLogin,
    userLoggedOut,
    getUserInfo,
    getAllProfiles,
    getCurrentUser,
    updateCurrentUser,
    // checkloggedIn,
};
