// dbb/usersQueries.js

const pool = require("./db");

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
        console.error(
            "[usersQueries > createUser] => Error creating user:",
            error
        );
        throw error;
    }
};

module.exports = {
    createUserQuery,
    // getUserById,
    // getUserByEmail,
    // updateProfilePic,
    // updateUser,
    // updateUserWithPassword,
    // updatePassword,
};
