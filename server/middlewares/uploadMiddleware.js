// middlewares/uploadMiddleware.js

const multer = require("multer");
const path = require("path");
const fs = require("fs");
const logger = require("../utils/logger");

// Ensure "uploads" directory exists
const uploadDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Custom Storage Configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir); // Save in the "uploads" folder
    },
    filename: (req, file, cb) => {
        // Get original filename without extension
        const originalName = path.parse(file.originalname).name;
        const { fileModifiedDate } = req.body;
        // Format the current date and time (DD.MM.YY_HH.mm.ss)
        const now = new Date();
        const currentDate = now.toLocaleDateString("en-GB").replace(/\//g, ".");
        const currentTime = now.toLocaleTimeString("en-GB", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false,
        });

        // Create new filename
        const newFileName = `${originalName} - ${fileModifiedDate} - ${currentDate}_${currentTime}${path.extname(
            file.originalname
        )}`;
        cb(null, newFileName);
    },
});

// Initialize Multer with Storage
const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        const allowedTypes = [
            "audio/mp4",
            "audio/m4a",
            "audio/mp3",
            "audio/wav",
            "audio/ogg",
            "audio/mpeg",
        ];
        if (!allowedTypes.includes(file.mimetype)) {
            logger.warn(`Invalid file type: ${file.mimetype}`);
            return cb(
                new Error("Only MP4, M4A, MP3, WAV, and OGG files are allowed")
            );
        }
        cb(null, true);
    },
    limits: { fileSize: 80 * 1024 * 1024 }, // 80MB limit
});

const uploadMiddleware = (req, res, next) => {
    const uploadSingle = upload.single("audioFile");

    uploadSingle(req, res, (err) => {
        if (err) {
            // Handle Multer-specific errors
            if (err instanceof multer.MulterError) {
                logger.error(`Multer error: ${err.message}`);
                return res.status(500).json({
                    success: false,
                    message: `File upload error: ${err.message}`,
                });
            }

            // Handle unknown errors
            logger.error(`Upload error: ${err.message}`);
            return res.status(500).json({
                success: false,
                message: `${err.message}`,
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

        logger.info(`File successfully uploaded: ${req.file.filename}`);

        next();
    });
};

module.exports = uploadMiddleware;
