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
}) => {
    try {
        const insertQuery = `
            INSERT INTO transcription_backups (transcript_id, user_id, user_role, raw_api_data)
            VALUES ($1, $2, $3, $4)
            RETURNING *;
        `;
        const insertValues = [transcript_id, user_id, user_role, raw_api_data];
        const result = await pool.query(insertQuery, insertValues);
        return result.rows[0];
    } catch (error) {
        logger.error(
            `[transcriptionBackupsQueries > insertTranscriptionBackupQuery] Error: ${error.message}`
        );
        throw error;
    }
};

const insertTranscriptionQuery = async ({
    user_id,
    file_name,
    transcript_id,
    transcription,
    file_recorded_at,
}) => {
    try {
        const insertQuery =
            "INSERT INTO transcriptions (user_id, file_name, transcript_id, transcription, file_recorded_at) VALUES ($1, $2, $3, $4, $5) RETURNING *";
        const insertValues = [
            user_id,
            file_name,
            transcript_id,
            transcription,
            file_recorded_at,
        ];

        const insertedTranscription = await pool.query(
            insertQuery,
            insertValues
        );

        return insertedTranscription.rows[0];
    } catch (error) {
        logger.error(
            `[transcribeQueries > insertTranscription] => Error inserting transcription: ${error.message}`
        );

        throw error;
    }
};

const getAllTranscriptionsQuery = async () => {
    try {
        logger.info("[transcribeQueries > getAllTranscriptionsQuery] - Start");
        const fetchQuery =
            "SELECT * FROM transcriptions ORDER BY file_recorded_at DESC";
        const { rows } = await pool.query(fetchQuery);

        if (rows.length === 0) {
            logger.error(
                "[transcribeQueries > getAllTranscriptions] => No transcriptions found"
            );
            return [];
        }
        logger.info(
            `[transcribeQueries > getAllTranscriptionsQuery] - Fetched ${rows.length} transcriptions`
        );
        return rows;
    } catch (error) {
        logger.error(
            `[transcribeQueries > getAllTranscriptions] => Error getting all transcriptions: ${error.message}`
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
            "[transcribeQueries > getFilteredTranscriptionsQuery] - Start"
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
            where.push(`file_recorded_at >= $${params.length}`);
        }
        if (filters.date_to) {
            params.push(filters.date_to);
            where.push(`file_recorded_at <= $${params.length}`);
        }

        let orderBy = "file_recorded_at";
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
            `[transcribeQueries > getFilteredTranscriptionsQuery] - Fetched ${rows.length} transcriptions with filters`
        );
        return rows;
    } catch (error) {
        logger.error(
            `[transcribeQueries > getFilteredTranscriptions] => Error getting filtered transcriptions: ${error.message}`
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
                `[transcribeQueries > getTranscriptionByApiTranscriptId] => Transcription not found with ID: ${transcriptId}`
            );
            return false;
        }

        return transcription.rows[0];
    } catch (error) {
        logger.error(
            `[transcribeQueries > getTranscriptionByApiTranscriptId] => Error getting transcription by ID: ${error.message}`
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
                `[transcribeQueries > getTranscriptionByIdQuery] => Transcription not found with ID: ${id}`
            );
            return false;
        }

        return transcription.rows[0];
    } catch (error) {
        logger.error(
            `[transcribeQueries > getTranscriptionByIdQuery] => Error getting transcription by ID: ${error.message}`
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
            `[transcribeQueries > getTranscriptionByIdQuery] => Error getting transcription by ID: ${error.message}`
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
};
