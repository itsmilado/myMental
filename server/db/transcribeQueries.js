// db/transcribeQueries.js

const pool = require("./db");
const logger = require("../utils/logger");

const insertTranscriptionQuery = async ({
    user_id,
    filename,
    transcriptionText,
    fileRecordedAt,
    transcriptId,
}) => {
    try {
        const insertQuery =
            "INSERT INTO transcriptions (user_id, filename, transcription, file_recorded_at, transcript_id) VALUES ($1, $2, $3, $4, $5) RETURNING *";
        const insertValues = [
            user_id,
            filename,
            transcriptionText,
            fileRecordedAt,
            transcriptId,
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
        const fetchQuery =
            "SELECT * FROM transcriptions ORDER BY file_recorded_at DESC";
        const transcription = await pool.query(fetchQuery);

        if (transcription.rows.length === 0) {
            logger.error(
                "[transcribeQueries > getAllTranscriptions] => No transcriptions found"
            );
            return false;
        }

        return transcription.rows;
    } catch (error) {
        logger.error(
            `[transcribeQueries > getAllTranscriptions] => Error getting all transcriptions: ${error.message}`
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

const getTranscriptionByIdQuery = async (tid) => {
    try {
        const fetchQuery = `
        SELECT * FROM transcriptions
        WHERE tid = $1
         `;
        const fetchValues = [tid];

        const transcription = await pool.query(fetchQuery, fetchValues);

        if (transcription.rows.length === 0) {
            logger.error(
                `[transcribeQueries > getTranscriptionById] => Transcription not found with ID: ${tid}`
            );
            return false;
        }

        return transcription.rows[0];
    } catch (error) {
        logger.error(
            `[transcribeQueries > getTranscriptionById] => Error getting transcription by ID: ${error.message}`
        );

        throw error;
    }
};

module.exports = {
    insertTranscriptionQuery,
    getAllTranscriptionsQuery,
    getTranscriptionByApiTranscriptIdQuery,
    getTranscriptionByIdQuery,
};
