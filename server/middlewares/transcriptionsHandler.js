// middleWares/transcriptionMiddleWare.js

const fs = require("fs");
const path = require("path");
const { processUploadedFile } = require("../utils/processUploadedFile");
const {
    assemblyClient,
    assemblyClientUpload,
    transcribeAudio,
} = require("../utils/assemblyaiClient");
const {
    insertTranscriptionQuery,
    getAllTranscriptionsQuery,
    getTranscriptionByApiTranscriptIdQuery,
    getTranscriptionByIdQuery,
} = require("../db/transcribeQueries");
const logger = require("../utils/logger");
const { request } = require("http");
const { response } = require("express");

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
            `[transcriptionsMiddleware - getAllTranscriptions] => Transcriptions found: ${JSON.stringify(
                transcriptions
            )}`
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
        // Handle file to upload
        const { filePath, filename, fileRecordedAt, formattedDate } =
            processUploadedFile(request.file);
        logger.info(
            `Incoming request from user_id ${loggedUserId} to ${request.method} ${request.originalUrl}`
        );

        // Upload the audio file to AssemblyAI
        const uploadResponse = await assemblyClientUpload(filePath);
        const uploadUrl = uploadResponse.upload_url;
        if (!uploadResponse || !uploadResponse.upload_url) {
            logger.error(
                `[transcriptionsMiddleware - createTranscription] => Error uploading file to AssemblyAI ${error.message}`
            );
            response.status(500).json({
                success: false,
                message: "Error uploading file to AssemblyAI",
            });
            throw new Error("Error uploading file to AssemblyAI");
        }
        logger.info(
            `[transcriptionsMiddleware - createTranscription] => Upload file to AssemblyAI successfull, response object: ${JSON.stringify(
                uploadResponse
            )}`
        );

        // Request a transcription using the transcribeAudio function
        const transcriptResponse = await transcribeAudio(uploadUrl);
        const transcriptId = transcriptResponse.id;
        if (!transcriptResponse || !transcriptResponse.id) {
            logger.error(
                `[transcriptionsMiddleware - createTranscription] => Error transcribing audio file: ${error.message}`
            );
            response.status(500).json({
                success: false,
                message: "Error transcribing audio file",
            });
            throw new Error("Error transcribing audio file");
        }

        // Poll AssemblyAI for the transcription result
        let transcript;
        while (true) {
            transcript = await assemblyClient.transcripts.get(transcriptId);
            if (transcript.status === "completed") {
                logger.info(
                    `[transcriptionsMiddleware - createTranscription] => Transcription completed: ${JSON.stringify(
                        transcript
                    )}`
                ); // change to transcriptId to avoid circular reference
                break;
            } else if (transcript.status === "failed") {
                logger.error(
                    `[transcriptionsMiddleware - createTranscription] => Transcription failed: ${JSON.stringify(
                        transcriptId
                    )}`
                );
                throw new Error("Transcription failed");
            }
            await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait for 5 seconds before polling again
        }

        const transcriptData = {
            user_id: loggedUserId,
            filename: filename,
            fileRecordedAt: fileRecordedAt,
            transcriptId: transcriptId,
            transcriptObject: transcript,
        };

        // Store transcription and metadata to the database
        const insertedTranscription = await storeTranscriptionText({
            transcriptData,
        });

        // Define the path for the transcription text file
        const transcriptionFilename = `${
            path.parse(filename).name
        }_${formattedDate}.txt`;
        const transcriptionFilePath = path.join(
            __dirname,
            "../transcriptions",
            transcriptionFilename
        );

        // Ensure the transcriptions directory exists
        if (!fs.existsSync(path.dirname(transcriptionFilePath))) {
            fs.mkdirSync(path.dirname(transcriptionFilePath), {
                recursive: true,
            });
        }

        // Write the transcription to a text file
        fs.writeFileSync(transcriptionFilePath, transcriptionText);

        // Respond with the transcription and file details
        response.status(200).json({
            success: true,
            message: "Transcription created and stored successfully",
            data: insertedTranscription,
        });
    } catch (error) {
        logger.error(
            `[transcriptionsMiddleware - createTranscription] => Error: ${error.message}`
        );
        next(error);
    }
};

const fetchTranscriptionById = async (req, res) => {
    const { id } = req.params;
    try {
        // Fetch the transcription by ID
        const transcription = await getTranscriptionByIdQuery(id);
        if (!transcription) {
            return res.status(404).json({ message: "Transcription not found" });
        }
        res.json(transcription);
    } catch (error) {
        console.error("Error fetching transcription:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

const fetchTranscriptionByApiId = async (req, res) => {
    const { transcriptId } = req.params;
    try {
        // Fetch the transcription by API transcript ID
        const transcription = await getTranscriptionByApiTranscriptIdQuery(
            transcriptId
        );
        if (!transcription) {
            return res.status(404).json({ message: "Transcription not found" });
        }
        res.json(transcription);
    } catch (error) {
        console.error("Error fetching transcription:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

const fetchApiTranscriptionById = async (request, response, next) => {
    try {
        logger.info(
            `Incoming request to ${request.method} ${request.originalUrl}`
        ); // Log the request URL
        const { transcript_id } = request.body;

        const transcript = await assemblyClient.transcripts.get(transcript_id);
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
            `[transcriptionsMiddleware - fetchApiTranscriptionById] => Error fetching transcription by ID: ${error.message}`
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
            [transcriptionMiddleware - createTranscription - storeTranscriptionText] => Transcription utterance text(before db): ${transcriptionText}
            `);

        const transcriptionDataToInsert = {
            transcriptionText: transcriptionText,
            ...transcriptData,
        };
        const insertedTranscription = await insertTranscriptionQuery(
            transcriptionDataToInsert
        );

        logger.info(
            `Transcription stored in database. insertedTranscription: ${JSON.stringify(
                insertedTranscription
            )}`
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
