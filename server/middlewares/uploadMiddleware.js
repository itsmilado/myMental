// middlewares/uploadMiddleware.js

const multer = require("multer");
const path = require("path");
const logger = require("../utils/logger");

const upload = multer({ dest: "uploads/" });
const uploadMiddleware = (req, res, next) => {
    const uploadSingle = upload.single("audioFile");

    uploadSingle(req, res, (err) => {
        if (err) {
            // Handle Multer-specific errors
            if (err instanceof multer.MulterError) {
                logger.error(`Multer error: ${err.message}`);
                return res.status(400).json({
                    success: false,
                    message: `File upload error: ${err.message}`,
                });
            }

            // Handle unknown errors
            logger.error(`Unknown upload error: ${err.message}`);
            return res.status(500).json({
                success: false,
                message: "An unknown error occurred during file upload.",
            });
        }

        // Ensure the file exists before proceeding
        if (!req.file) {
            logger.warn("No file uploaded in the request");
            return res.status(400).json({
                success: false,
                message: "No file uploaded. Please provide a valid audio file.",
            });
        }

        // Get the original filename without the extension
        const originalName = path.parse(req.file.originalname).name;

        // Get the current date and time in the format DD.MM.YY_HH:mm
        const now = new Date();
        const currentDate = now.toLocaleDateString("en-GB").replace(/\//g, ".");
        const currentTime = now
            .toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
            .replace(/:/g, ".");

        // Add the processed name to the request object
        req.file.processedName = `${originalName}_${currentDate}_${currentTime}`;

        logger.info(
            `File successfully uploaded to server : ${req.file.originalname}, processed name: ${req.file.processedName}`
        );

        next();
    });
};

module.exports = uploadMiddleware;
