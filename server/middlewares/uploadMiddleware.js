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
        const safeDate = fileModifiedDate
            ? new Date(fileModifiedDate)
            : new Date();

        const fileModifiedDisplayDate = formatISOToCustomDate(fileModifiedDate);
        const now = new Date();
        const currentDate = now.toLocaleDateString("en-GB").replace(/\//g, ".");

        // Create new filename
        const safeName = originalName.replace(/[^\w]+/g, "_");
        const newFileName = `${safeName}_Recorded(${fileModifiedDisplayDate})_Transcribed(${currentDate})${path.extname(
            file.originalname
        )}`;
        cb(null, newFileName);
    },
});

// Initialize Multer with Storage
const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        logger.info(
            `Incoming file: ${file.originalname}, type: ${file.mimetype}`
        );
        const allowedTypes = [
            "audio/mp4",
            "audio/m4a",
            "audio/x-m4a",
            "audio/mp3",
            "audio/wav",
            "audio/x-wav",
            "audio/ogg",
            "audio/mpeg",
            "audio/webm",
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

// Format date for display
const formatISOToCustomDate = (isoString) => {
    const date = new Date(isoString);
    const pad = (n) => String(n).padStart(2, "0");

    const day = pad(date.getDate());
    const month = pad(date.getMonth() + 1); // Months are zero-based
    const year = String(date.getFullYear()).slice(-2);
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());

    return `${day}.${month}.${year}_${hours}:${minutes}`;
};

module.exports = uploadMiddleware;
