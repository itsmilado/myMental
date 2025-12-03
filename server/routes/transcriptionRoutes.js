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
    exportTranscription,
    deleteDBTranscription,
    fetchAssemblyAIHistory,
    deleteAssemblyAiTranscript,
    restoreTranscription,
    startTranscriptionJob,
    streamTranscriptionProgress,
} = require("../middlewares/transcriptionsHandler");

// Start a transcription job (returns { jobId } immediately)
transcriptionRoutes.post(
    "/start",
    isAuthenticated,
    uploadMiddleware, // still need file from multipart form
    startTranscriptionJob,
    errorHandler
);

// Stream live progress for a given jobId via Server-Sent Events
transcriptionRoutes.get(
    "/progress/:jobId",
    isAuthenticated,
    streamTranscriptionProgress,
    errorHandler
);

// Route to handle file upload and transcription (legacy, non-SSE)
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

transcriptionRoutes.get(
    "/export/:id",
    isAuthenticated,
    exportTranscription,
    errorHandler
);

transcriptionRoutes.delete(
    "/delete/dbTranscription/:id",
    isAuthenticated,
    deleteDBTranscription,
    errorHandler
);

transcriptionRoutes.get(
    "/assemblyai/history",
    isAuthenticated,
    fetchAssemblyAIHistory,
    errorHandler
);

transcriptionRoutes.delete(
    "/assemblyai/delete/:transcriptId",
    isAuthenticated,
    deleteAssemblyAiTranscript,
    errorHandler
);

transcriptionRoutes.post(
    "/restore",
    isAuthenticated,
    restoreTranscription,
    errorHandler
);

module.exports = { transcriptionRoutes };
