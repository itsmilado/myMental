// middlwares/usersRoutesHandler.js

const { hashPassword } = require("../utils/hashPass");
const { logger } = require("../utils/logger");
const {
    createUserQuery,
    // getUserById,
    // getUserByEmail,
} = require("../db/usersQueries");

const createUsers = async (request, response, next) => {
    try {
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
        console.error(
            "[usersRoutesHandler > Line 15 - createUsers] => Error creating user:",
            error
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
