// db/usersQueries.js

const pool = require("./db");
const logger = require("../utils/logger");

const createUserQuery = async ({
    first_name,
    last_name,
    email,
    hashed_password,
    user_role,
    auth_provider = "local",
    google_sub = null,
}) => {
    try {
        const insertQuery = `
            INSERT INTO users (
                first_name,
                last_name,
                email,
                hashed_password,
                user_role,
                auth_provider,
                google_sub
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *;
        `;

        const insertValues = [
            first_name,
            last_name,
            email,
            hashed_password,
            user_role,
            auth_provider,
            google_sub,
        ];

        const createdUser = await pool.query(insertQuery, insertValues);
        return createdUser.rows[0];
    } catch (error) {
        logger.error(`[createUserQuery] Error: ${error.message}`);
        throw error;
    }
};

// find by google_sub
const getUserByGoogleSubQuery = async ({ google_sub }) => {
    const q = `SELECT * FROM users WHERE google_sub = $1 LIMIT 1;`;
    const r = await pool.query(q, [google_sub]);
    return r.rows[0] || null;
};

// link google_sub/auth_provider to existing user
const linkGoogleSubByIdQuery = async ({ id, google_sub }) => {
    const q = `
        UPDATE users
        SET google_sub = COALESCE(google_sub, $2)
        WHERE id = $1
        RETURNING *;
    `;
    const r = await pool.query(q, [id, google_sub]);
    return r.rows[0] || null;
};

const getUserByIdQuery = async ({ id }) => {
    try {
        const fetchQuery = "SELECT * FROM users WHERE id = $1";
        const fetchValues = [id];

        const user = await pool.query(fetchQuery, fetchValues);

        if (user.rows.length === 0) {
            logger.error(
                `[usersQueries > getUserByIdQuery] => User not found with ID: ${id}`,
            );
            return false; // Explicitly return false if no user is found
        }

        return user.rows[0];
    } catch (error) {
        logger.error(
            `[usersQueries > getUserById] => Error getting user by ID: ${error.message}`,
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
                `[usersQueries > getUserByIdQuery] => User not found with Email: ${email}`,
            );
            return false; // Explicitly return false if no user is found
        }

        return user.rows[0];
    } catch (error) {
        logger.error(
            `[usersQueries > getUserByEmail] => Error getting user by email: ${error.message}`,
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
                `[usersQueries > getAllUsersQuery] => No users retrieved`,
            );
            return false; // Explicitly return false if no user is found
        }

        return users.rows;
    } catch (error) {
        logger.error(
            `[usersQueries > getAllUsers] => Error getting all users: ${error.message}`,
        );

        throw error; // Rethrow the error to be caught in the calling function
    }
};

const updateUserByIdQuery = async ({ id, first_name, last_name, email }) => {
    try {
        const updateQuery = `
            UPDATE users
            SET
                first_name = COALESCE($2, first_name),
                last_name = COALESCE($3, last_name),
                email = COALESCE($4, email)
            WHERE id = $1
            RETURNING *;
        `;

        const updateValues = [
            id,
            first_name ?? null,
            last_name ?? null,
            email ?? null,
        ];

        const updated = await pool.query(updateQuery, updateValues);

        if (updated.rows.length === 0) {
            return false;
        }

        return updated.rows[0];
    } catch (error) {
        logger.error(
            `[usersQueries > updateUserByIdQuery] => Error updating user: ${error.message}`,
        );
        throw error;
    }
};

const getUserPreferencesByIdQuery = async ({ id }) => {
    const q = `SELECT preferences FROM users WHERE id = $1;`;
    const res = await pool.query(q, [id]);
    if (!res.rows.length) return null;
    return res.rows[0].preferences;
};

const updateUserPreferencesByIdQuery = async ({ id, preferences }) => {
    const q = `
        UPDATE users
        SET preferences = $2
        WHERE id = $1
        RETURNING preferences;
    `;
    const res = await pool.query(q, [id, preferences]);
    if (!res.rows.length) return null;
    return res.rows[0].preferences;
};

const deleteUserByIdQuery = async ({ id }) => {
    try {
        const q = `DELETE FROM users WHERE id = $1 RETURNING id;`;
        const res = await pool.query(q, [id]);
        return res.rows[0] || null;
    } catch (error) {
        logger.error(
            `[usersQueries > deleteUserByIdQuery] => Error deleting user: ${error.message}`,
        );
        throw error;
    }
};

const updateUserPasswordByIdQuery = async ({ id, hashed_password }) => {
    try {
        const q = `
            UPDATE users
            SET hashed_password = $2
            WHERE id = $1
            RETURNING *;
        `;
        const res = await pool.query(q, [id, hashed_password]);
        return res.rows[0] || null;
    } catch (error) {
        logger.error(
            `[usersQueries > updateUserPasswordByIdQuery] => Error updating password: ${error.message}`,
        );
        throw error;
    }
};

const setPendingEmailChangeQuery = async ({
    id,
    pending_email,
    token_hash,
    expires_at,
}) => {
    const q = `
        UPDATE users
        SET pending_email = $2,
            email_confirm_token_hash = $3,
            email_confirm_expires_at = $4
        WHERE id = $1
        RETURNING *;
    `;
    const r = await pool.query(q, [id, pending_email, token_hash, expires_at]);
    return r.rows[0] || null;
};

const setEmailConfirmationTokenByIdQuery = async ({
    id,
    token_hash,
    expires_at,
}) => {
    const q = `
        UPDATE users
        SET email_confirm_token_hash = $2,
            email_confirm_expires_at = $3
        WHERE id = $1
        RETURNING *;
    `;
    const r = await pool.query(q, [id, token_hash, expires_at]);
    return r.rows[0] || null;
};

const confirmEmailByTokenHashQuery = async ({ token_hash }) => {
    const q = `
        UPDATE users
        SET email = COALESCE(pending_email, email),
            pending_email = NULL,
            email_confirm_token_hash = NULL,
            email_confirm_expires_at = NULL,
            "isconfirmed" = TRUE
        WHERE email_confirm_token_hash = $1
          AND email_confirm_expires_at IS NOT NULL
          AND email_confirm_expires_at > NOW()
        RETURNING *;
    `;
    const r = await pool.query(q, [token_hash]);
    return r.rows[0] || null;
};

const unlinkGoogleByIdQuery = async ({ id }) => {
    const q = `
        UPDATE users
        SET google_sub = NULL,
            auth_provider = 'local'
        WHERE id = $1
        RETURNING *;
    `;
    const r = await pool.query(q, [id]);
    return r.rows[0] || null;
};

const setPasswordResetTokenByIdQuery = async ({
    id,
    token_hash,
    expires_at,
}) => {
    try {
        const q = `
            UPDATE users
            SET password_reset_token_hash = $1,
                password_reset_expires_at = $2
            WHERE id = $3
            RETURNING id;
        `;
        const values = [token_hash, expires_at, id];
        const res = await pool.query(q, values);
        return res.rows[0] || null;
    } catch (error) {
        logger.error(
            `[usersQueries > setPasswordResetTokenByIdQuery] => Error: ${error.message}`,
        );
        throw error;
    }
};

const getUserByPasswordResetTokenHashQuery = async ({ token_hash }) => {
    try {
        const q = `
            SELECT id, email, user_role, password_reset_expires_at
            FROM users
            WHERE password_reset_token_hash = $1
            LIMIT 1;
        `;
        const res = await pool.query(q, [token_hash]);
        return res.rows[0] || null;
    } catch (error) {
        logger.error(
            `[usersQueries > getUserByPasswordResetTokenHashQuery] => Error: ${error.message}`,
        );
        throw error;
    }
};

const clearPasswordResetTokenByIdQuery = async ({ id }) => {
    try {
        const q = `
            UPDATE users
            SET password_reset_token_hash = NULL,
                password_reset_expires_at = NULL
            WHERE id = $1
            RETURNING id;
        `;
        const res = await pool.query(q, [id]);
        return res.rows[0] || null;
    } catch (error) {
        logger.error(
            `[usersQueries > clearPasswordResetTokenByIdQuery] => Error: ${error.message}`,
        );
        throw error;
    }
};

const confirmPendingEmailByTokenHashQuery = async ({ token_hash }) => {
    const q = `
        UPDATE users
        SET email = pending_email,
            pending_email = NULL,
            email_confirm_token_hash = NULL,
            email_confirm_expires_at = NULL,
            "isconfirmed" = TRUE
        WHERE email_confirm_token_hash = $1
          AND pending_email IS NOT NULL
          AND email_confirm_expires_at IS NOT NULL
          AND email_confirm_expires_at > NOW()
        RETURNING *;
    `;
    const r = await pool.query(q, [token_hash]);
    return r.rows[0] || null;
};

module.exports = {
    createUserQuery,
    getUserByIdQuery,
    getUserByEmailQuery,
    getAllUsersQuery,
    updateUserByIdQuery,
    getUserPreferencesByIdQuery,
    updateUserPreferencesByIdQuery,
    deleteUserByIdQuery,
    updateUserPasswordByIdQuery,
    setPendingEmailChangeQuery,
    confirmPendingEmailByTokenHashQuery,
    setPasswordResetTokenByIdQuery,
    getUserByPasswordResetTokenHashQuery,
    clearPasswordResetTokenByIdQuery,
    getUserByGoogleSubQuery,
    linkGoogleSubByIdQuery,
    unlinkGoogleByIdQuery,
    confirmEmailByTokenHashQuery,
    setEmailConfirmationTokenByIdQuery,
};
