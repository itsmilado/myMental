// middleWares/transcriptionMiddleWare.js

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
} = require("../db/transcribeQueries");
const logger = require("../utils/logger");
const { assemblyClient } = require("../utils/assemblyaiClient");

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

const createTranscription = async (request, response, next) => {
    try {
        const loggedUserId = request.session.user.id;
        const { filePath, filename } = { ...request.file };
        const { fileModifiedDate } = { ...request.body } || "00.00.00"; // default to 00.00.00 if not provided or invalid

        logger.info(
            `Incoming request to Transcribe from user_id ${loggedUserId} to "${request.method} ${request.originalUrl}"`
        );

        logger.info(
            `[transcriptionHandler - createTranscription] => filename, fileModifiedDate in request.file: ${filename} - ${fileModifiedDate}`
        );

        // Upload the audio file to AssemblyAI API
        const uploadUrl = await uploadAudioFile(filePath);

        // Request a transcription
        const transcriptId = await requestTranscription(uploadUrl);

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
            fileModifiedDate
        );

        // Send response
        response.status(200).json({
            success: true,
            message: `Transcription created and stored successfully at: ${storedTxtfilePath}`,
            data: insertedTranscription,
        });
    } catch (error) {
        logger.error(`[createTranscription] => Error: ${error.message}`);
        next(error);
    }
};

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

// Helper functions

const storeTranscriptionText = async ({ transcriptData }) => {
    try {
        let transcriptionText = "";
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

module.exports = {
    createTranscription,
    fetchAllTranscriptions,
    fetchTranscriptionById,
    fetchTranscriptionByApiId,
    fetchApiTranscriptionById,
};
