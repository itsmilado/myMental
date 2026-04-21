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

/*
- purpose: insert a transcription backup row into the database
- inputs: transcript id, user info, raw AssemblyAI response, file metadata, optional category, and connection metadata
- outputs: inserted transcription_backups row
- important behavior:
  - stores the full raw API response for later restore and history use
  - keeps metadata aligned with the original transcription request
  - returns the inserted row from the database
*/
const insertTranscriptionBackupQuery = async ({
    transcript_id,
    user_id,
    user_role,
    raw_api_data,
    file_name,
    category = null,
    file_recorded_at,
    assemblyai_connection_id = null,
    assemblyai_connection_label = null,
    assemblyai_connection_source = "legacy_unknown",
}) => {
    try {
        const insertQuery = `
            INSERT INTO transcription_backups (
                transcript_id,
                user_id,
                user_role,
                raw_api_data,
                file_name,
                category,
                file_recorded_at,
                assemblyai_connection_id,
                assemblyai_connection_label,
                assemblyai_connection_source
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING *;
        `;

        const insertValues = [
            transcript_id,
            user_id,
            user_role,
            raw_api_data,
            file_name,
            category,
            file_recorded_at ?? null,
            assemblyai_connection_id,
            assemblyai_connection_label,
            assemblyai_connection_source,
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

/*
- purpose: fetch backup rows for a list of transcript ids
- inputs: transcriptIds array, user_id, and admin flag
- outputs: array of backup rows
- important behavior:
  - filters by user_id unless admin
  - returns raw API data and metadata needed for restore and history
*/
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
            SELECT 
                transcript_id,
                user_id,
                file_name,
                category,
                file_recorded_at,
                raw_api_data,
                assemblyai_connection_id,
                assemblyai_connection_label,
                assemblyai_connection_source
            FROM transcription_backups
            WHERE transcript_id = ANY($1)
        `;

        if (!isAdmin) {
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

/*
- purpose: fetch one backup row by transcript id
- inputs: transcript_id
- outputs: one transcription_backups row or null
- important behavior:
  - returns the raw API response together with stored backup metadata
  - reads only one matching row
  - returns null when no backup exists
*/
const getBackupWithRawByTranscriptIdQuery = async (transcript_id) => {
    try {
        const query = `
            SELECT transcript_id,
                   file_name,
                   category,
                   file_recorded_at,
                   raw_api_data,
                   assemblyai_connection_id,
                   assemblyai_connection_label,
                   assemblyai_connection_source
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
    category = null,
    file_recorded_at,
    assemblyai_connection_id = null,
    assemblyai_connection_label = null,
    assemblyai_connection_source = "legacy_unknown",
}) => {
    try {
        const insertQuery = `
            INSERT INTO transcriptions (
                user_id,
                file_name,
                audio_duration,
                transcript_id,
                transcription,
                options,
                category,
                file_recorded_at,
                assemblyai_connection_id,
                assemblyai_connection_label,
                assemblyai_connection_source
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING *;
        `;
        const insertValues = [
            user_id,
            file_name,
            audio_duration,
            transcript_id,
            transcription,
            options,
            category,
            file_recorded_at,
            assemblyai_connection_id,
            assemblyai_connection_label,
            assemblyai_connection_source,
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

/*
- purpose: fetch filtered and sorted transcription rows for a user
- inputs: filters object with user_id, file_name, transcript_id, optional category, date range, and sort settings
- outputs: array of transcription rows
- important behavior:
  - always scopes results by user_id when provided
  - applies only allowed sort fields and directions
  - limits results to the latest 500 rows
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

        if (filters.category) {
            params.push(filters.category);
            where.push(`category = $${params.length}`);
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

        let fetchQuery = `
            SELECT
                id,
                user_id,
                file_name,
                audio_duration,
                transcript_id,
                transcription,
                options,
                category,
                file_recorded_at,
                assemblyai_connection_id,
                assemblyai_connection_label,
                assemblyai_connection_source,
                created_at
            FROM transcriptions
        `;

        if (where.length > 0) {
            fetchQuery += " WHERE " + where.join(" AND ");
        }

        fetchQuery += ` ORDER BY ${orderBy} ${direction} LIMIT 500`;

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

const deleteTranscriptionsByUserIdQuery = async ({ user_id }) => {
    try {
        const q = `
            DELETE FROM transcriptions
            WHERE user_id = $1
            RETURNING id, file_name, transcript_id;
        `;
        const { rows } = await pool.query(q, [user_id]);
        return rows || [];
    } catch (error) {
        logger.error(
            `[transcribeQueries > deleteTranscriptionsByUserIdQuery] => Error: ${error.message}`,
        );
        throw error;
    }
};

const deleteTranscriptionBackupsByUserIdQuery = async ({ user_id }) => {
    try {
        const q = `
            DELETE FROM transcription_backups
            WHERE user_id = $1
            RETURNING transcript_id, file_name;
        `;
        const { rows } = await pool.query(q, [user_id]);
        return rows || [];
    } catch (error) {
        logger.error(
            `[transcribeQueries > deleteTranscriptionBackupsByUserIdQuery] => Error: ${error.message}`,
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
    deleteTranscriptionsByUserIdQuery,
    deleteTranscriptionBackupsByUserIdQuery,
};
