// routes/transcriptionRoutes.js

const express = require("express");
const transcriptionRoutes = express.Router();

const { isAuthenticated } = require("../middlewares/authMiddleware");
const uploadMiddleware = require("../middlewares/uploadMiddleware");
const errorHandler = require("../middlewares/errorHandler");
const {
    createTranscription,
    fetchAllTranscriptions,
    fetchTranscriptionById,
    fetchTranscriptionByApiId,
    fetchApiTranscriptionById,
    fetchFilteredTranscriptions,
} = require("../middlewares/transcriptionsHandler");

// Route to handle file upload and transcription
transcriptionRoutes.post(
    "/upload",
    isAuthenticated,
    uploadMiddleware,
    createTranscription,
    errorHandler
);

transcriptionRoutes.get(
    "/all_transcriptions",
    isAuthenticated,
    fetchAllTranscriptions,
    errorHandler
);

transcriptionRoutes.get(
    "/filtered_transcriptions",
    isAuthenticated,
    fetchFilteredTranscriptions,
    errorHandler
);

transcriptionRoutes.get(
    "/by_id/:id",
    isAuthenticated,
    fetchTranscriptionById,
    errorHandler
);

transcriptionRoutes.get(
    "/by_api_id/:transcriptId",
    isAuthenticated,
    fetchTranscriptionByApiId,
    errorHandler
);

transcriptionRoutes.get(
    "/apiTranscriptId",
    isAuthenticated,
    fetchApiTranscriptionById,
    errorHandler
);

module.exports = { transcriptionRoutes };
