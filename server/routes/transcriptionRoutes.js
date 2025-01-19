// routes/transcriptionRoutes.js

const express = require("express");
const transcriptionRoutes = express.Router();

const { uploadMiddleware } = require("../middlewares/uploadMiddleware");
const {
    errorHandler,
    transcriptionMiddleware,
} = require("../middlewares/transcriptionMiddleware");

// Route to handle file upload and transcription
transcriptionRoutes.post(
    "/upload",
    uploadMiddleware,
    transcriptionMiddleware,
    errorHandler
);

module.exports = { transcriptionRoutes };
