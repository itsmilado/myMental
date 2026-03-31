// db/userApiKeysQueries.js

const pool = require("./db");
const logger = require("../utils/logger");

const PROVIDER = "assemblyai";

const mapRow = (row) => {
    if (!row) return null;

    return {
        ...row,
        is_default: Boolean(row.is_default),
    };
};

const getUserApiKeysQuery = async ({ user_id, provider = PROVIDER }) => {
    try {
        const query = `
            SELECT
                id,
                user_id,
                provider,
                label,
                key_hint_last4,
                is_default,
                status,
                last_validated_at,
                created_at,
                updated_at
            FROM user_api_keys
            WHERE user_id = $1
              AND provider = $2
            ORDER BY is_default DESC, updated_at DESC, id DESC
        `;
        const values = [user_id, provider];
        const { rows } = await pool.query(query, values);
        return rows.map(mapRow);
    } catch (error) {
        logger.error(
            `[userApiKeysQueries > getUserApiKeysQuery] => Error: ${error.message}`,
        );
        throw error;
    }
};

const getUserApiKeyByIdQuery = async ({ id, user_id, provider = PROVIDER }) => {
    try {
        const query = `
            SELECT
                id,
                user_id,
                provider,
                label,
                encrypted_api_key,
                key_hint_last4,
                is_default,
                status,
                last_validated_at,
                created_at,
                updated_at
            FROM user_api_keys
            WHERE id = $1
              AND user_id = $2
              AND provider = $3
            LIMIT 1
        `;
        const values = [id, user_id, provider];
        const { rows } = await pool.query(query, values);
        return mapRow(rows[0] || null);
    } catch (error) {
        logger.error(
            `[userApiKeysQueries > getUserApiKeyByIdQuery] => Error: ${error.message}`,
        );
        throw error;
    }
};

const createUserApiKeyQuery = async ({
    user_id,
    provider = PROVIDER,
    label,
    encrypted_api_key,
    key_hint_last4,
    is_default = false,
    status = "active",
    last_validated_at = null,
}) => {
    try {
        const query = `
            INSERT INTO user_api_keys (
                user_id,
                provider,
                label,
                encrypted_api_key,
                key_hint_last4,
                is_default,
                status,
                last_validated_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING
                id,
                user_id,
                provider,
                label,
                key_hint_last4,
                is_default,
                status,
                last_validated_at,
                created_at,
                updated_at
        `;
        const values = [
            user_id,
            provider,
            label,
            encrypted_api_key,
            key_hint_last4,
            is_default,
            status,
            last_validated_at,
        ];

        const { rows } = await pool.query(query, values);
        return mapRow(rows[0]);
    } catch (error) {
        logger.error(
            `[userApiKeysQueries > createUserApiKeyQuery] => Error: ${error.message}`,
        );
        throw error;
    }
};

const updateUserApiKeyQuery = async ({
    id,
    user_id,
    label,
    encrypted_api_key,
    key_hint_last4,
    status,
    last_validated_at,
}) => {
    try {
        const updates = [];
        const values = [id, user_id];

        if (typeof label === "string") {
            values.push(label);
            updates.push(`label = $${values.length}`);
        }

        if (typeof encrypted_api_key === "string") {
            values.push(encrypted_api_key);
            updates.push(`encrypted_api_key = $${values.length}`);
        }

        if (typeof key_hint_last4 === "string") {
            values.push(key_hint_last4);
            updates.push(`key_hint_last4 = $${values.length}`);
        }

        if (typeof status === "string") {
            values.push(status);
            updates.push(`status = $${values.length}`);
        }

        if (last_validated_at !== undefined) {
            values.push(last_validated_at);
            updates.push(`last_validated_at = $${values.length}`);
        }

        if (updates.length === 0) {
            return getUserApiKeyByIdQuery({ id, user_id });
        }

        updates.push(`updated_at = CURRENT_TIMESTAMP`);

        const query = `
            UPDATE user_api_keys
            SET ${updates.join(", ")}
            WHERE id = $1
              AND user_id = $2
            RETURNING
                id,
                user_id,
                provider,
                label,
                key_hint_last4,
                is_default,
                status,
                last_validated_at,
                created_at,
                updated_at
        `;

        const { rows } = await pool.query(query, values);
        return mapRow(rows[0] || null);
    } catch (error) {
        logger.error(
            `[userApiKeysQueries > updateUserApiKeyQuery] => Error: ${error.message}`,
        );
        throw error;
    }
};

const clearDefaultUserApiKeysQuery = async ({
    user_id,
    provider = PROVIDER,
}) => {
    try {
        const query = `
            UPDATE user_api_keys
            SET
                is_default = false,
                updated_at = CURRENT_TIMESTAMP
            WHERE user_id = $1
              AND provider = $2
              AND is_default = true
            RETURNING id
        `;
        const values = [user_id, provider];
        const { rows } = await pool.query(query, values);
        return rows;
    } catch (error) {
        logger.error(
            `[userApiKeysQueries > clearDefaultUserApiKeysQuery] => Error: ${error.message}`,
        );
        throw error;
    }
};

const setDefaultUserApiKeyQuery = async ({
    id,
    user_id,
    provider = PROVIDER,
}) => {
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        await client.query(
            `
                UPDATE user_api_keys
                SET
                    is_default = false,
                    updated_at = CURRENT_TIMESTAMP
                WHERE user_id = $1
                  AND provider = $2
                  AND is_default = true
            `,
            [user_id, provider],
        );

        const { rows } = await client.query(
            `
                UPDATE user_api_keys
                SET
                    is_default = true,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $1
                  AND user_id = $2
                  AND provider = $3
                RETURNING
                    id,
                    user_id,
                    provider,
                    label,
                    key_hint_last4,
                    is_default,
                    status,
                    last_validated_at,
                    created_at,
                    updated_at
            `,
            [id, user_id, provider],
        );

        await client.query("COMMIT");
        return mapRow(rows[0] || null);
    } catch (error) {
        await client.query("ROLLBACK");
        logger.error(
            `[userApiKeysQueries > setDefaultUserApiKeyQuery] => Error: ${error.message}`,
        );
        throw error;
    } finally {
        client.release();
    }
};

const deleteUserApiKeyQuery = async ({ id, user_id, provider = PROVIDER }) => {
    try {
        const query = `
            DELETE FROM user_api_keys
            WHERE id = $1
              AND user_id = $2
              AND provider = $3
            RETURNING
                id,
                user_id,
                provider,
                label,
                key_hint_last4,
                is_default,
                status,
                last_validated_at,
                created_at,
                updated_at
        `;
        const values = [id, user_id, provider];
        const { rows } = await pool.query(query, values);
        return mapRow(rows[0] || null);
    } catch (error) {
        logger.error(
            `[userApiKeysQueries > deleteUserApiKeyQuery] => Error: ${error.message}`,
        );
        throw error;
    }
};

const countUserApiKeysQuery = async ({ user_id, provider = PROVIDER }) => {
    try {
        const query = `
            SELECT COUNT(*)::int AS total
            FROM user_api_keys
            WHERE user_id = $1
              AND provider = $2
        `;
        const values = [user_id, provider];
        const { rows } = await pool.query(query, values);
        return rows[0]?.total || 0;
    } catch (error) {
        logger.error(
            `[userApiKeysQueries > countUserApiKeysQuery] => Error: ${error.message}`,
        );
        throw error;
    }
};

module.exports = {
    getUserApiKeysQuery,
    getUserApiKeyByIdQuery,
    createUserApiKeyQuery,
    updateUserApiKeyQuery,
    clearDefaultUserApiKeysQuery,
    setDefaultUserApiKeyQuery,
    deleteUserApiKeyQuery,
    countUserApiKeysQuery,
};
