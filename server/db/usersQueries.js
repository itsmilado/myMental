// dbb/usersQueries.js

const pool = require("./db");
const logger = require("../utils/logger");

const createUserQuery = async ({
    first_name,
    last_name,
    email,
    hashed_password,
    user_role,
}) => {
    try {
        const createdUser = await pool.query(
            `INSERT INTO users (first_name, last_name, email, hashed_password, user_role) 
            VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [first_name, last_name, email, hashed_password, user_role]
        );

        return createdUser.rows[0];
    } catch (error) {
        logger.error(
            `[usersQueries > createUser] => Error creating user: ${error.message}`
        );

        throw error; // Rethrow the error to be caught in the calling function
    }
};

const getUserByIdQuery = async ({ id }) => {
    try {
        const user = await pool.query("SELECT * FROM users WHERE id = $1", [
            id,
        ]);
        if (user.rows.length === 0) {
            logger.error(
                `[usersQueries > getUserByIdQuery] => User not found with ID: ${id}`
            );
            return false; // Explicitly return false if no user is found
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

const getAllUsersQuery = async () => {
    try {
        const users = await pool.query("SELECT * FROM users");
        if (users.rows.length === 0) {
            logger.error(
                `[usersQueries > getAllUsersQuery] => No users retrieved`
            );
            return null; // Explicitly return null if no user is found
        }
        return users.rows;
    } catch (error) {
        logger.error(
            `[usersQueries > getAllUsers] => Error getting all users: ${error.message}`
        );
        throw error; // Rethrow the error to be caught in the calling function
    }
};

module.exports = {
    createUserQuery,
    getUserByIdQuery,
    getUserByEmailQuery,
    getAllUsersQuery,
    // updateProfilePic,
    // updateUser,
    // updateUserWithPassword,
    // updatePassword,
};
