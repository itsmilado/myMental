const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { getFileModifiedDate } = require("../utils/getMod");

// Configure storage options
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "uploads/"); // Specify the destination directory
    },
    filename: (req, file, cb) => {
        // Store the file with a temporary name
        const tempFilename = `${Date.now()}_${file.originalname}`;
        cb(null, tempFilename);
    },
});

// Initialize multer with the storage configuration
const upload = multer({ storage });

// Middleware to handle single file upload
const uploadMiddleware = (req, res, next) => {
    const uploadSingle = upload.single("audioFile");

    uploadSingle(req, res, (err) => {
        if (err) {
            return next(err);
        }

        // Get the original filename without the extension
        const originalName = path.parse(req.file.originalname).name;

        // Get the current date and time in the format DD.MM.YY_HH:mm
        const now = new Date();
        const currentDate = now.toLocaleDateString("en-GB").replace(/\//g, ".");
        const currentTime = now
            .toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
            .replace(/:/g, ".");
        const currentDateTime = `${currentDate}_${currentTime}`;
        // Get the modified date of the original file
        const modifiedDate = getFileModifiedDate(req.file.path)
            .toLocaleDateString("en-GB")
            .replace(/\//g, ".");

        // Combine the elements to form the new filename
        const newFilename = `${originalName}_${currentDateTime}_${modifiedDate}${path.extname(
            req.file.originalname
        )}`;

        // Define the new file path
        const newPath = path.join(req.file.destination, newFilename);

        // Rename the file
        fs.rename(req.file.path, newPath, (err) => {
            if (err) {
                return next(err);
            }

            // Update the file path and filename in the request object
            req.file.path = newPath;
            req.file.filename = newFilename;

            next();
        });
    });
};

module.exports = { uploadMiddleware };
