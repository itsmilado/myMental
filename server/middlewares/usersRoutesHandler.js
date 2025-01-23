// middlwares/usersRoutesHandler.js

const { hashPassword } = require("../utils/hashPass");
const logger = require("../utils/logger");
const {
    createUserQuery,
    // getUserById,
    // getUserByEmail,
} = require("../db/usersQueries");

const createUsers = async (request, response, next) => {
    try {
        logger.info(
            `Incoming request to ${request.method} ${request.originalUrl}`
        ); // Log the request URL
        logger.info(`Request body: ${JSON.stringify(request.body)}`); // Log the request body

        const { password } = request.body;
        const hashed_password = await hashPassword(password);
        const newUser = await createUserQuery({
            ...request.body,
            hashed_password,
        });

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

module.exports = {
    createUsers,
    // userLogin,
    // userLoggedOut,
    // getUserInfo,
    // checkloggedIn,
};
