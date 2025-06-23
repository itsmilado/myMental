// middleWares/transcriptionMiddleWare.js

// Import required modules and utilities
const { saveTranscriptionToFile } = require("../utils/fileProcessor");
const uploadAudioFile = require("../utils/assemblyaiUploader");
const {
    requestTranscription,
    pollTranscriptionResult,
} = require("../utils/assemblyaiTranscriber");
const {
    insertTranscriptionQuery,
    getAllTranscriptionsQuery,
    getTranscriptionByApiTranscriptIdQuery,
    getTranscriptionByIdQuery,
    getFilteredTranscriptionsQuery,
    deleteTranscriptionByIdQuery,
} = require("../db/transcribeQueries");
const logger = require("../utils/logger");
const { assemblyClient } = require("../utils/assemblyaiClient");
const { fetchAssemblyHistory } = require("../utils/assemblyaiHistory");
const { exportTranscriptionToFile } = require("../utils/exportService");
const { request, response } = require("express");

/**
 * Fetch all transcriptions from the database.
 * Logs incoming request and result.
 */

const fetchAllTranscriptions = async (request, response, next) => {
    try {
        logger.info(
            `Incoming request to ${request.method} ${request.originalUrl}`
        );

        const transcriptions = await getAllTranscriptionsQuery();
        if (!transcriptions) {
            response
                .status(404)
                .json({ success: false, message: "No transcriptions found" });
            return;
        }

        logger.info(
            `[transcriptionsMiddleware - fetchAllTranscriptions] => Transcriptions retrieved`
        );
        response.status(200).json({
            success: true,
            message: "Transcriptions found",
            data: transcriptions,
        });
    } catch (error) {
        logger.error(
            `[transcriptionsMiddleware - getAllTranscriptions] => Error fetching transcriptions: ${error.message}`
        );
        next(error);
    }
};

/**
 * Fetch filtered transcriptions based on query parameters and user session.
 * Logs incoming request, filters, and result.
 */
const fetchFilteredTranscriptions = async (request, response, next) => {
    try {
        logger.info(
            `Incoming request to ${request.method} ${request.originalUrl}`
        );
        const userId = request.session.user.id;
        // Extract filters from query parameters
        const {
            file_name,
            transcript_id,
            date_from,
            date_to,
            order_by,
            direction,
        } = request.query;
        const filters = {
            user_id: userId,
            file_name,
            transcript_id,
            date_from,
            date_to,
            order_by,
            direction,
        };
        logger.info(
            `[transcriptionsMiddleware - fetchFilteredTranscriptions] => Filters: ${JSON.stringify(
                filters
            )}`
        );
        const transcriptions = await getFilteredTranscriptionsQuery(filters);
        if (!transcriptions) {
            response
                .status(404)
                .json({ success: false, message: "No transcriptions found" });
            return;
        }
        logger.info(
            `[transcriptionsMiddleware - fetchFilteredTranscriptions] => Filtered Transcriptions retrieved`
        );
        response.status(200).json({
            success: true,
            message: "Transcriptions found",
            data: transcriptions,
        });
    } catch (error) {
        logger.error(
            `[transcriptionsMiddleware - getAllTranscriptions] => Error fetching transcriptions: ${error.message}`
        );
        next(error);
    }
};

/**
 * Create a new transcription from an uploaded audio file.
 * Handles file upload, transcription request, polling, DB storage, and file export.
 * Logs all major steps and errors.
 */
const createTranscription = async (request, response, next) => {
    try {
        const loggedUserId = request.session.user.id;
        const { path: filePath, filename } = request.file;
        const rawDate = request.body.fileModifiedDate; // safe for DB
        const fileModifiedDate = rawDate ? new Date(rawDate) : "00.00.00";

        // Format date for display
        const fileModifiedDisplayDate = fileModifiedDate
            .toLocaleString("en-GB")
            .replace(/\//g, ".");

        logger.info(
            `Incoming request to Transcribe from user_id ${loggedUserId} to "${request.method} ${request.originalUrl}"`
        );

        logger.info(
            `[transcriptionHandler - createTranscription] => filename, fileModifiedDate in request.file: ${filename} - ${fileModifiedDisplayDate}`
        );
        logger.info(
            `[Transcription] Received options: ${JSON.stringify(
                request.body.options
            )}`
        );

        // Parse user options from request body
        let userOptions = {};
        userOptions =
            typeof request.body.options === "string"
                ? JSON.parse(request.body.options)
                : request.body.options;

        // Upload the audio file to AssemblyAI API
        const uploadUrl = await uploadAudioFile(filePath);

        // Prepare transcription options for API
        const transcriptionOptions = {
            audio_url: uploadUrl,
            ...userOptions,
        };

        logger.info(
            `[createTranscription] transcriptionOptions: ${JSON.stringify(
                transcriptionOptions
            )}`
        );

        // Request a transcription from AssemblyAI
        const transcriptId = await requestTranscription(transcriptionOptions);

        // Poll for transcription result
        const transcript = await pollTranscriptionResult(transcriptId);

        // Store transcription in the database
        const transcriptData = {
            user_id: loggedUserId,
            file_name: filename,
            transcript_id: transcriptId,
            file_recorded_at: fileModifiedDate,
            transcriptObject: transcript,
        };
        const insertedTranscription = await storeTranscriptionText({
            transcriptData,
        });

        // Save the transcription to a file
        const storedTxtfilePath = saveTranscriptionToFile(
            filename,
            insertedTranscription.transcription,
            fileModifiedDisplayDate
        );

        // Send response to client
        response.status(200).json({
            success: true,
            message: `Transcription created and stored successfully at: ${storedTxtfilePath}`,
            TranscriptData: insertedTranscription,
        });
    } catch (error) {
        logger.error(`[createTranscription] => Error: ${error.message}`);
        next(error);
    }
};

/**
 * Fetch a transcription by its database ID.
 * Logs request, result, and errors.
 */

const fetchTranscriptionById = async (request, response, next) => {
    try {
        logger.info(
            `Incoming request to ${request.method} ${request.originalUrl}`
        );
        const { id } = request.params;
        // Fetch the transcription by ID
        const transcription = await getTranscriptionByIdQuery(id);
        if (!transcription) {
            logger.warn(
                `[transcriptionsMiddleware - fetchTranscriptionById] => Transcription with ID: ${id} not found`
            );
            response.status(401).json({
                success: false,
                message: `Transcription with ID: ${id} does not exist`,
            });
            return false;
        }
        logger.info(
            `[transcriptionsMiddleware - fetchTranscriptionById] => Transcription fetched with ID: ${id}`
        );
        response.status(200).json({
            success: true,
            message: "Transcription retrieved successfully",
            data: transcription,
        });
    } catch (error) {
        logger.error(
            `[transcriptionsMiddleware - fetchTranscriptionById] => Error fetching transcription with ID: ${error.message}`
        );
        next(error);
    }
};

/**
 * Fetch a transcription by its AssemblyAI API transcript ID.
 * Logs request, result, and errors.
 */
const fetchTranscriptionByApiId = async (request, response, next) => {
    try {
        const { transcriptId } = request.params;
        logger.info(
            `Incoming request to ${request.method} ${
                request.originalUrl
            }, params: ${JSON.stringify(request.params)}`
        );
        // Fetch the transcription by API transcript ID
        const transcription = await getTranscriptionByApiTranscriptIdQuery(
            transcriptId
        );
        if (!transcription) {
            logger.warn(
                `[transcriptionsMiddleware - fetchTranscriptionByApiId] => Transcription with API ID: ${transcriptId} not found`
            );
            response.status(401).json({
                success: false,
                message: `Transcription with API ID: ${transcriptId} does not exist`,
            });
            return false;
        }
        logger.info(
            `[transcriptionsMiddleware - fetchTranscriptionByApiId] => Transcription fetched with API ID: ${transcriptId}`
        );
        response.status(200).json({
            success: true,
            message: "Transcription fetched successfully",
            data: transcription,
        });
    } catch (error) {
        logger.error(
            `[transcriptionsMiddleware - fetchTranscriptionByApiId] => Error fetching transcription: ${error.message}`
        );
        next(error);
    }
};

/**
 * Fetch a transcription directly from the AssemblyAI API by transcript_id.
 * Logs request, result, and errors.
 */
const fetchApiTranscriptionById = async (request, response, next) => {
    try {
        const { transcript_id } = request.body;
        logger.info(
            `Incoming request to ${request.method} ${
                request.originalUrl
            } body: ${JSON.stringify(
                request.body
            )}, transcript_id: ${transcript_id}`
        ); // Log the request URL

        const transcript = await assemblyClient.transcripts.get(
            `${transcript_id}`
        );
        if (!transcript) {
            logger.error(
                `[transcriptionsMiddleware - fetchApiTranscriptionById] => Error fetching transcription by ID: ${error.message}`
            );
            response.status(500).json({
                success: false,
                message: "Error fetching transcription from API by ID",
            });
            throw new Error("Error fetching transcription from API by ID");
        }

        logger.info(
            `[transcriptionsMiddleware - fetchApiTranscriptionById] => Transcription fetched by ID: ${transcript_id}`
        );
        response.status(200).json({
            success: true,
            message: "Transcription fetched successfully",
            data: transcript,
        });
    } catch (error) {
        logger.error(
            `[transcriptionsMiddleware - fetchApiTranscriptionById] => Error fetching transcription : ${error.message}`
        );
        next(error);
    }
};

/**
 * Export a transcription in the requested format (txt, etc.).
 * Checks user authorization and logs all steps.
 */
const exportTranscription = async (request, response, next) => {
    try {
        const { id } = request.params;
        const format = (request.query.format || "txt").toLowerCase();
        const user = request.session.user;

        logger.info(
            `Incoming request to ${request.method} ${request.originalUrl}`
        ); // Log the request URL

        // Fetch transcription
        const transcription = await getTranscriptionByIdQuery(id);
        if (!transcription) {
            logger.error(
                `[transcriptionsMiddleware - fetchApiTranscriptionById] => Error fetching transcription by ID: ${error.message}`
            );
            return response.status(404).json({
                success: false,
                message: `transcription with ID ${id} Not found`,
            });
        }
        // Check user authorization
        if (transcription.user_id !== user.id && user.role !== "admin") {
            return response.status(403).json({
                success: false,
                message: "You are not authorized to access this resource!",
            });
        }

        // Export transcription to file
        const { buffer, mime, fileName } = await exportTranscriptionToFile(
            transcription,
            format
        );

        logger.info(
            `[transcriptionsMiddleware - exportTranscription] => file name: ${fileName} `
        );

        response.setHeader("Content-Type", mime);
        response.setHeader(
            "Content-Disposition",
            `attachment; filename="${fileName}"`
        );
        response.send(buffer);
        logger.info(
            `[transcriptionsMiddleware - exportTranscription] User ${request.session.user.id} exported ${transcription.transcript_id} as ${format}`
        );
    } catch (error) {
        logger.error(
            `[transcriptionsMiddleware - exportTranscription] => Error exporting transcription : ${error.message}`
        );
        next(error);
    }
};

const deleteDBTranscription = async (request, response, next) => {
    try {
        const { id } = request.params;
        const user = request.session.user;

        logger.info(
            `Incoming request to ${request.method} ${request.originalUrl}`
        ); // Log the request URL

        const transcription = await getTranscriptionByIdQuery(id);
        if (!transcription) {
            logger.error(
                `[transcriptionsMiddleware - fetchApiTranscriptionById] => transcription with ID ${id} Not found`
            );
            return response.status(404).json({
                success: false,
                message: `transcription with ID ${id} Not found`,
            });
        }
        if (transcription.user_id !== user.id && user.role !== "admin") {
            return response.status(403).json({
                success: false,
                message: "You are not Not Authorized to access this resource!",
            });
        }

        // Only delete from DB
        const transcriptionDeleted = await deleteTranscriptionByIdQuery(id);
        if (!transcriptionDeleted) {
            logger.error(
                `[transcriptionsMiddleware - deleteDBTranscription] => Error delete transcription by ID: ${error.message}`
            );
            next(error);
        }
        logger.info(
            `[deleteTranscription] User ${user.id} deleted transcription ${id} from database`
        );
        // remove associated local files here
        response.json({
            success: true,
            message: `transcription with ID ${id} successfully deleted.`,
        });
    } catch (error) {
        next(error);
    }
};

const fetchAssemblyAIHistory = async (request, response, next) => {
    try {
        const user = request.session.user;
        const { transcript_id } = request.query;
        logger.info(
            `Incoming request to ${request.method} ${request.originalUrl}`
        ); // Log the request URL
        const transcriptions = await fetchAssemblyHistory();

        if (!transcriptions) {
            response.status(500).json({
                success: false,
                message: "Error fetching transcription from API by ID",
            });
            throw new Error("Error fetching transcription from API by ID");
        }

        const results = transcriptions.map((t) => ({
            transcript_id: t.transcript_id,
            created_at: t.created_at,
            status: t.status,
            audio_url: t.audio_url,
            audio_duration: t.audio_duration,
            speech_model: t.speech_model,
            language: t.language,
            transcription: flattenTranscription(t.transcript),
            // more fields if needed, e.g. features
        }));

        response.status(200).json({
            success: true,
            message: "API Transcription fetched successfully",
            data: results,
        });
    } catch (error) {
        logger.error(
            `[transcriptionsMiddleware - fetchAssemblyAIHistory] => Error fetching transcriptions: ${error.message}`
        );
        next(error);
    }
};

const deleteAssemblyAiTranscript = async (request, response, next) => {
    try {
        const { transcriptId } = request.params;
        const userId = request.session.user.id;
        logger.info(
            `Incoming request to ${request.method} ${request.originalUrl}, params: ${request.params}`
        ); // Log the request URL

        // Allow only if user is owner or admin
        if (!userId && request.session.user.role !== "admin") {
            logger.warn(
                `[transcriptionsMiddleware - deleteAssemblyAiTranscript] => Unauthorized access attempt: ${request.originalUrl} `
            );
            return response.status(403).json({
                success: false,
                message: "You are not Not Authorized to access this resource!",
            });
        }
        // Delete from AssemblyAI
        // This permanently removes sensitive transcript data
        const { status } = await assemblyClient.transcripts.delete(
            transcriptId
        );
        if (status !== "completed") {
            logger.warn(
                `[transcriptionsMiddleware - deleteAssemblyAiTranscript] => Request to ${request.originalUrl} not successfull.`
            );
            throw error;
        }
        logger.info(
            `[transcriptionsMiddleware - deleteAssemblyAiTranscript] => Transcript with ID ${transcriptId} deleted from AssemblyAI API `
        );
        response.json({
            success: true,
            message: `Transcript with ID ${transcriptId} deleted from AssemblyAI API`,
        });
    } catch (error) {
        logger.error(
            `[transcriptionsMiddleware - deleteAssemblyAiTranscript] => Error delete transcript: ${error.message}`
        );
        next(error);
    }
};

const restoreTranscription = async (request, response, next) => {
    try {
        const userId = request.session.user.id;
        const { transcript_id, transcription, file_recorded_at } = request.body;

        logger.info(
            `Incoming request to ${request.method} ${request.originalUrl}, params: ${request.params}`
        ); // Log the request URL

        // Check for required data
        if (!transcript_id || !transcription || !file_recorded_at) {
            logger.warn(
                `[transcriptionsMiddleware - restoreTranscription] => Missing fields. transcript_id? "${transcript_id}" or transcription? "${transcription}" or file_recorded_at? "${file_recorded_at}"`
            );
            return response
                .status(400)
                .json({ success: false, message: "Missing fields" });
        }

        // Prevent duplicate
        const existing = await getTranscriptionByApiTranscriptIdQuery(
            transcript_id
        );
        if (existing) {
            logger.warn(
                `[transcriptionsMiddleware - restoreTranscription] => Transcript with ID: ${transcript_id} already exsist in databse`
            );
            return response
                .status(409)
                .json({ success: false, message: "Transcript already exists" });
        }
        const file_name = buildRestoredFileName(file_recorded_at);
        // Insert to DB
        const inserted = await insertTranscriptionQuery({
            user_id: userId,
            file_name,
            transcript_id,
            transcription,
            file_recorded_at,
        });

        logger.info(
            `[transcriptionsMiddleware - restoreTranscription] => Transcript with ID ${transcript_id} restored from AssemblyAI API `
        );

        return response.status(201).json({
            success: true,
            message: "Transcript restored to offline successfully",
            data: inserted,
        });
    } catch (error) {
        logger.error(
            `[transcriptionsMiddleware - restoreTranscription] => Error restoring transcript with ID: ${transcript_id}, Error: ${error.message}`
        );
        next(error);
    }
};

// Helper functions

/**
 * Helper to store transcription text in the database.
 * Converts utterances to plain text and inserts into DB.
 * @param {Object} transcriptData - Data containing transcript object and metadata.
 * @returns {Object} Inserted transcription record.
 */
const storeTranscriptionText = async ({ transcriptData }) => {
    try {
        let transcriptionText = "";
        // Concatenate all utterances into a single text block
        for (let utterance of transcriptData.transcriptObject.utterances) {
            transcriptionText += `Speaker ${utterance.speaker}: ${utterance.text}\n`;
        }
        logger.info(`
            [transcriptionMiddleware - createTranscription - storeTranscriptionText] => Transcription utterance text done.
            `);

        const transcriptionDataToInsert = {
            transcription: transcriptionText,
            ...transcriptData,
        };
        const insertedTranscription = await insertTranscriptionQuery({
            ...transcriptionDataToInsert,
        });

        logger.info(
            `Transcription stored in database. insertedTranscription: ${JSON.stringify(
                insertedTranscription.transcript_id
            )} Text: ${insertedTranscription.transcription}`
        );

        return insertedTranscription;
    } catch (error) {
        logger.error(
            `[transcriptionsMiddleware - storeTranscriptionText] => Error storing transcription: ${error.message}`
        );
        throw error;
    }
};

const buildRestoredFileName = (dateStr) => {
    const d = new Date(dateStr);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const hh = String(d.getHours()).padStart(2, "0");
    const min = String(d.getMinutes()).padStart(2, "0");
    const ss = String(d.getSeconds()).padStart(2, "0");
    return `restored-${yyyy}${mm}${dd}-${hh}${min}${ss}.txt`;
};

const flattenTranscription = (transcriptObject) => {
    if (!transcriptObject || !Array.isArray(transcriptObject.utterances))
        return "";
    return transcriptObject.utterances
        .map((u) => `Speaker ${u.speaker != null ? u.speaker : ""}: ${u.text}`)
        .join("\n");
};
// Export all middleware functions for use in routes
module.exports = {
    createTranscription,
    fetchAllTranscriptions,
    fetchTranscriptionById,
    fetchTranscriptionByApiId,
    fetchApiTranscriptionById,
    fetchFilteredTranscriptions,
    exportTranscription,
    deleteDBTranscription,
    fetchAssemblyAIHistory,
    deleteAssemblyAiTranscript,
    restoreTranscription,
};
