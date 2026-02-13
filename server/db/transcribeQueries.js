// db/transcribeQueries.js

const pool = require("./db");
const logger = require("../utils/logger");

const ALLOWED_SORT_FIELDS = [
    "file_recorded_at",
    "file_name",
    "transcript_id",
    "created_at",
];
const ALLOWED_DIRECTIONS = ["asc", "desc"];

const insertTranscriptionBackupQuery = async ({
    transcript_id,
    user_id,
    user_role,
    raw_api_data,
    file_name,
    file_recorded_at,
}) => {
    try {
        const insertQuery = `
            INSERT INTO transcription_backups (
                transcript_id,
                user_id,
                user_role,
                raw_api_data,
                file_name,
                file_recorded_at
            )
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *;
        `;
        const insertValues = [
            transcript_id,
            user_id,
            user_role,
            raw_api_data,
            file_name,
            file_recorded_at ?? null,
        ];
        const result = await pool.query(insertQuery, insertValues);
        return result.rows[0];
    } catch (error) {
        logger.error(
            `[transcriptionBackupsQueries > insertTranscriptionBackupQuery] Error: ${error.message}`,
        );
        throw error;
    }
};

// Get backup rows for a list of transcript_ids, scoped to a user.

const getBackupsByTranscriptIdsQuery = async ({
    transcriptIds = [],
    user_id = null,
    isAdmin = false,
}) => {
    if (!Array.isArray(transcriptIds) || transcriptIds.length === 0) {
        return [];
    }

    try {
        const params = [transcriptIds];
        let query = `
            SELECT transcript_id,
                   user_id,
                   file_name,
                   file_recorded_at,
                   raw_api_data
            FROM transcription_backups
            WHERE transcript_id = ANY($1)
        `;

        // If isAdmin is false, results are filtered to the provided user_id.
        if (!isAdmin) {
            // enforce user scoping
            params.push(user_id);
            query += ` AND user_id = $${params.length}`;
        }

        if (!isAdmin && user_id == null) return [];

        const { rows } = await pool.query(query, params);
        return rows;
    } catch (error) {
        logger.error(
            `[transcribeQueries > getBackupsByTranscriptIdsQuery] => Error fetching backups: ${error.message}`,
        );
        throw error;
    }
};

const getBackupWithRawByTranscriptIdQuery = async (transcript_id) => {
    try {
        const query = `
            SELECT transcript_id, file_name, file_recorded_at, raw_api_data
            FROM transcription_backups
            WHERE transcript_id = $1
            LIMIT 1
        `;
        const values = [transcript_id];
        const { rows } = await pool.query(query, values);
        return rows[0] || null;
    } catch (error) {
        logger.error(
            `[transcribeQueries > getBackupWithRawByTranscriptIdQuery] => Error: ${error.message}`,
        );
        throw error;
    }
};

const insertTranscriptionQuery = async ({
    user_id,
    file_name,
    audio_duration,
    transcript_id,
    transcription,
    options,
    file_recorded_at,
}) => {
    try {
        const insertQuery =
            "INSERT INTO transcriptions (user_id, file_name, audio_duration, transcript_id, transcription, options, file_recorded_at) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *";
        const insertValues = [
            user_id,
            file_name,
            audio_duration,
            transcript_id,
            transcription,
            options,
            file_recorded_at,
        ];

        const insertedTranscription = await pool.query(
            insertQuery,
            insertValues,
        );

        return insertedTranscription.rows[0];
    } catch (error) {
        logger.error(
            `[transcribeQueries > insertTranscription] => Error inserting transcription: ${error.message}`,
        );

        throw error;
    }
};

const getAllTranscriptionsQuery = async () => {
    try {
        logger.info("[transcribeQueries > getAllTranscriptionsQuery] - Start");

        const fetchQuery = `SELECT id,
            *,
            to_char(audio_duration, 'HH24:MI:SS') AS audio_duration
            FROM transcriptions ORDER BY id DESC`;
        const { rows } = await pool.query(fetchQuery);

        if (rows.length === 0) {
            logger.error(
                "[transcribeQueries > getAllTranscriptions] => No transcriptions found",
            );
            return [];
        }

        logger.info(
            `[transcribeQueries > getAllTranscriptionsQuery] - Fetched ${rows.length} transcriptions`,
        );

        return rows;
    } catch (error) {
        logger.error(
            `[transcribeQueries > getAllTranscriptions] => Error getting all transcriptions: ${error.message}`,
        );

        throw error;
    }
};

/**
 * Fetches filtered and sorted transcriptions for a given user.
 * @param {object} filters - Filtering and sorting options.
 * @returns {Promise<Array>} Array of transcription rows.
 */

const getFilteredTranscriptionsQuery = async (filters) => {
    try {
        logger.info(
            "[transcribeQueries > getFilteredTranscriptionsQuery] - Start",
        );
        const params = [];
        const where = [];

        // always filtered by user_id
        if (filters.user_id) {
            params.push(filters.user_id);
            where.push(`user_id = $${params.length}`);
        }
        if (filters.file_name) {
            params.push(`%${filters.file_name}%`);
            where.push(`file_name ILIKE $${params.length}`);
        }
        if (filters.transcript_id) {
            params.push(filters.transcript_id);
            where.push(`transcript_id = $${params.length}`);
        }
        if (filters.date_from) {
            params.push(filters.date_from);
            where.push(`created_at >= $${params.length}::date`);
        }

        if (filters.date_to) {
            params.push(filters.date_to);
            where.push(
                `created_at < ($${params.length}::date + INTERVAL '1 day')`,
            );
        }

        let orderBy = "id";
        let direction = "DESC";
        if (
            filters.order_by &&
            ALLOWED_SORT_FIELDS.includes(filters.order_by)
        ) {
            orderBy = filters.order_by;
        }
        if (
            filters.direction &&
            ALLOWED_DIRECTIONS.includes(filters.direction.toLowerCase())
        ) {
            direction = filters.direction.toUpperCase();
        }

        let fetchQuery = "SELECT * FROM transcriptions";
        if (where.length > 0) {
            fetchQuery += " WHERE " + where.join(" AND ");
        }

        fetchQuery += ` ORDER BY ${orderBy} ${direction} LIMIT 100`;

        const { rows } = await pool.query(fetchQuery, params);
        logger.info(
            `[transcribeQueries > getFilteredTranscriptionsQuery] - Fetched ${rows.length} transcriptions with filters`,
        );
        return rows;
    } catch (error) {
        logger.error(
            `[transcribeQueries > getFilteredTranscriptions] => Error getting filtered transcriptions: ${error.message}`,
        );
        throw error;
    }
};

const getTranscriptionByApiTranscriptIdQuery = async (transcriptId) => {
    try {
        const fetchQuery = `
        SELECT * FROM transcriptions
        WHERE transcript_id = $1
        `;
        const fetchValues = [transcriptId];

        const transcription = await pool.query(fetchQuery, fetchValues);

        if (transcription.rows.length === 0) {
            logger.error(
                `[transcribeQueries > getTranscriptionByApiTranscriptId] => Transcription not found with ID: ${transcriptId}`,
            );
            return false;
        }

        return transcription.rows[0];
    } catch (error) {
        logger.error(
            `[transcribeQueries > getTranscriptionByApiTranscriptId] => Error getting transcription by ID: ${error.message}`,
        );

        throw error;
    }
};

const getTranscriptionByIdQuery = async (id) => {
    try {
        const fetchQuery = `
        SELECT * FROM transcriptions
        WHERE id = $1
         `;
        const fetchValues = [id];

        const transcription = await pool.query(fetchQuery, fetchValues);

        if (transcription.rows.length === 0) {
            logger.error(
                `[transcribeQueries > getTranscriptionByIdQuery] => Transcription not found with ID: ${id}`,
            );
            return false;
        }

        return transcription.rows[0];
    } catch (error) {
        logger.error(
            `[transcribeQueries > getTranscriptionByIdQuery] => Error getting transcription by ID: ${error.message}`,
        );

        throw error;
    }
};

const deleteTranscriptionByIdQuery = async (id) => {
    try {
        await pool.query("DELETE FROM transcriptions WHERE id = $1", [id]);
        return true;
    } catch (error) {
        logger.error(
            `[transcribeQueries > getTranscriptionByIdQuery] => Error getting transcription by ID: ${error.message}`,
        );

        throw error;
    }
};

module.exports = {
    insertTranscriptionBackupQuery,
    insertTranscriptionQuery,
    getAllTranscriptionsQuery,
    getTranscriptionByApiTranscriptIdQuery,
    getTranscriptionByIdQuery,
    getFilteredTranscriptionsQuery,
    deleteTranscriptionByIdQuery,
    getBackupsByTranscriptIdsQuery,
    getBackupWithRawByTranscriptIdQuery,
};
