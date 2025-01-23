// dbb/usersQueries.js

const pool = require("./db");
const logger = require("../utils/logger");

const createUserQuery = async ({
    first_name,
    last_name,
    email,
    hashed_password,
}) => {
    try {
        const createdUser = await pool.query(
            `INSERT INTO users (first_name, last_name, email, hashed_password) 
            VALUES ($1, $2, $3, $4) RETURNING *`,
            [first_name, last_name, email, hashed_password]
        );

        return createdUser.rows[0];
    } catch (error) {
        logger.error(
            `[usersQueries > createUser] => Error creating user: ${error.message}`
        );

        throw error; // Rethrow the error to be caught in the calling function
    }
};

const getUserByIdQuery = async ({ user_id }) => {
    try {
        const user = await pool.query("SELECT * FROM users WHERE id = $1", [
            user_id,
        ]);
        if (user.rows.length === 0) {
            logger.error(
                `[usersQueries > getUserByIdQuery] => User not found with ID: ${user_id}`
            );
            return null; // Explicitly return null if no user is found
        }
        return user.rows[0];
    } catch (error) {
        logger.error(
            `[usersQueries > getUserById] => Error getting user by ID: ${error.message}`
        );
        throw error; // Rethrow the error to be caught in the calling function
    }
};

const getUserByEmailQuery = async ({ email }) => {
    try {
        const user = await pool.query("SELECT * FROM users WHERE email = $1", [
            email,
        ]);
        if (user.rows.length === 0) {
            logger.error(
                `[usersQueries > getUserByIdQuery] => User not found with ID: ${user_id}`
            );
            return null; // Explicitly return null if no user is found
        }
        return user.rows[0];
    } catch (error) {
        logger.error(
            `[usersQueries > getUserByEmail] => Error getting user by email: ${error.message}`
        );
        throw error; // Rethrow the error to be caught in the calling function
    }
};

module.exports = {
    createUserQuery,
    getUserByIdQuery,
    getUserByEmailQuery,
    // updateProfilePic,
    // updateUser,
    // updateUserWithPassword,
    // updatePassword,
};
