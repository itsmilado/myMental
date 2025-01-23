// routes/transcriptionRoutes.js

const express = require("express");
const transcriptionRoutes = express.Router();

const uploadMiddleware = require("../middlewares/uploadMiddleware");
const {
    errorHandler,
    createTranscription,
    fetchAllTranscriptions,
    fetchTranscriptionById,
    fetchTranscriptionByApiTranscriptId,
} = require("../middlewares/transcriptionsHandler");

// Route to handle file upload and transcription
transcriptionRoutes.post(
    "/upload",
    uploadMiddleware,
    createTranscription,
    errorHandler
);

transcriptionRoutes.get("/", fetchAllTranscriptions, errorHandler);

transcriptionRoutes.get("/by_id/:id", fetchTranscriptionById, errorHandler);

transcriptionRoutes.get(
    "/by_api_id/:apiTranscriptId",
    fetchTranscriptionByApiTranscriptId,
    errorHandler
);

module.exports = { transcriptionRoutes };
