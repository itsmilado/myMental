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
        const parsed =
            fileModifiedDate && !Number.isNaN(Date.parse(fileModifiedDate))
                ? new Date(fileModifiedDate)
                : new Date(); // fallback to "now"

        const fileModifiedDisplayDate = formatISOToCustomDate(parsed);
        const now = new Date();
        const currentDate = now.toLocaleDateString("en-GB").replace(/\//g, ".");

        // Create new filename
        const safeName = originalName.replace(/[^\w]+/g, "_");
        const newFileName = `${safeName}_Recorded(${fileModifiedDisplayDate})_Transcribed(${currentDate})${path.extname(
            file.originalname,
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
            "audio/vnd.dlna.adts",
            "audio/x-m4a",
            "audio/mp3",
            "audio/wav",
            "audio/x-wav",
            "audio/ogg",
            "audio/mpeg",
            "audio/webm",
        ];

        if (!allowedTypes.includes(file.mimetype)) {
            logger.warn(
                `[uploadMiddleware.fileFilter] => validate mime type: denied | ${JSON.stringify(
                    {
                        mimeType: file.mimetype,
                        originalName: file.originalname,
                    },
                )}`,
            );

            return cb(
                new Error("Only MP4, M4A, MP3, WAV, and OGG files are allowed"),
            );
        }

        return cb(null, true);
    },
    limits: { fileSize: 80 * 1024 * 1024 },
});

/*
- purpose: parse a single audio upload request and stop the request on upload errors
- inputs: express request, response, and next callback
- outputs: forwards to next middleware or returns an upload error response
- important behavior:
  - accepts a single file from the audioFile field
  - handles both multer-specific and general upload errors
  - requires a parsed file before allowing the request to continue
*/
const uploadMiddleware = (req, res, next) => {
    const uploadSingle = upload.single("audioFile");

    uploadSingle(req, res, (err) => {
        if (err) {
            if (err instanceof multer.MulterError) {
                logger.error(
                    `[uploadMiddleware.uploadMiddleware] => process upload: failed | ${JSON.stringify(
                        {
                            errorType: "multer",
                            error: err.message,
                        },
                    )}`,
                );

                return res.status(500).json({
                    success: false,
                    message: `File upload error: ${err.message}`,
                });
            }

            logger.error(
                `[uploadMiddleware.uploadMiddleware] => process upload: failed | ${JSON.stringify(
                    {
                        errorType: "general",
                        error: err.message,
                    },
                )}`,
            );

            return res.status(500).json({
                success: false,
                message: `${err.message}`,
            });
        }

        if (!req.file) {
            logger.warn(
                `[uploadMiddleware.uploadMiddleware] => validate upload payload: denied | ${JSON.stringify(
                    {
                        reason: "No_file_uploaded",
                    },
                )}`,
            );

            return res.status(400).json({
                success: false,
                message: "No file uploaded. Please provide a valid audio file.",
            });
        }

        logger.info(
            `[uploadMiddleware.uploadMiddleware] => process upload: success | ${JSON.stringify(
                {
                    fileName: req.file.filename,
                },
            )}`,
        );

        next();
    });
};

// Format date for display
const formatISOToCustomDate = (isoString) => {
    const date = isoString instanceof Date ? isoString : new Date(isoString);
    if (Number.isNaN(date.getTime())) {
        // hard fallback to something safe
        return "00.00.00_00:00";
    }
    const pad = (n) => String(n).padStart(2, "0");

    const day = pad(date.getDate());
    const month = pad(date.getMonth() + 1); // Months are zero-based
    const year = String(date.getFullYear()).slice(-2);
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());

    return `${day}.${month}.${year}_${hours}:${minutes}`;
};

module.exports = uploadMiddleware;
