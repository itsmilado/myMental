// db/transcribeQueries.js

const pool = require("./db");

/**
 * Insert a new transcription record into the database.
 * @param {string} filename - The name of the audio file.
 * @param {string} transcriptionText - The transcribed text.
 * @param {Date} fileRecordedAt - The date and time when the audio was recorded.
 * @param {string} transcriptId - The AssemblyAI transcript ID.
 * @returns {Promise<void>}
 */
const insertTranscription = async (
    filename,
    transcriptionText,
    fileRecordedAt,
    transcriptId
) => {
    const query = `
    INSERT INTO transcriptions (filename, transcription, file_recorded_at, transcript_id)
    VALUES ($1, $2, $3, $4)
  `;
    const values = [filename, transcriptionText, fileRecordedAt, transcriptId];

    try {
        await pool.query(query, values);
    } catch (error) {
        console.error("Error inserting transcription:", error);
        throw error;
    }
};

const getAllTranscriptions = async () => {
    const query = "SELECT * FROM transcriptions ORDER BY recorded_at DESC";
    const { rows } = await pool.query(query);
    return rows;
};

const getTranscriptionByApiTranscriptId = async (transcriptId) => {
    const query = `
    SELECT * FROM transcriptions
    WHERE transcript_id = $1
  `;
    const values = [transcriptId];

    try {
        const result = await pool.query(query, values);
        return result.rows[0] || null;
    } catch (error) {
        console.error("Error retrieving transcription:", error);
        throw error;
    }
};

const getTranscriptionById = async (tid) => {
    const query = `
    SELECT * FROM transcriptions
    WHERE tid = $1
  `;
    const values = [tid];

    try {
        const result = await pool.query(query, values);
        return result.rows[0] || null;
    } catch (error) {
        console.error("Error retrieving transcription:", error);
        throw error;
    }
};

module.exports = {
    insertTranscription,
    getAllTranscriptions,
    getTranscriptionByApiTranscriptId,
    getTranscriptionById,
};
