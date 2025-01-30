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
        const insertQuery = `INSERT INTO users (first_name, last_name, email, hashed_password, user_role) 
            VALUES ($1, $2, $3, $4, $5) RETURNING *`;
        const insertValues = [
            first_name,
            last_name,
            email,
            hashed_password,
            user_role,
        ];

        const createdUser = await pool.query(insertQuery, insertValues);

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
        const fetchQuery = "SELECT * FROM users WHERE id = $1";
        const fetchValues = [id];

        const user = await pool.query(fetchQuery, fetchValues);

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
        const fetchQuery = "SELECT * FROM users WHERE email = $1";
        const fetchValues = [email];

        const user = await pool.query(fetchQuery, fetchValues);

        if (user.rows.length === 0) {
            logger.error(
                `[usersQueries > getUserByIdQuery] => User not found with Email: ${email}`
            );
            return false; // Explicitly return false if no user is found
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
        const fetchQuery = "SELECT * FROM users";
        const users = await pool.query(fetchQuery);

        if (users.rows.length === 0) {
            logger.error(
                `[usersQueries > getAllUsersQuery] => No users retrieved`
            );
            return false; // Explicitly return false if no user is found
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
