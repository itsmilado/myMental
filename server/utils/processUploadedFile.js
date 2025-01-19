// utils/processUploadedFile.js

const fs = require("fs");
const path = require("path");
const date = require("date-and-time");

/**
 * Process the uploaded file to retrieve metadata.
 * @param {object} file - The uploaded file object from Multer.
 * @returns {object} - Information about the uploaded file.
 * @throws {Error} - If the file does not exist or an error occurs during file processing.
 */
const processUploadedFile = (file) => {
    if (!file) {
        throw new Error("No file uploaded");
    }

    const filePath = path.resolve(file.path);

    // Retrieve the file's last modified date
    const stats = fs.statSync(filePath);
    const fileRecordedAt = stats.mtime;

    // Format the date and time for the filename
    const formattedDate = date.format(fileRecordedAt, "YYYY-MM-DD_HH-mm-ss");

    return {
        filePath,
        filename: file.filename,
        fileRecordedAt,
        formattedDate,
    };
};

module.exports = {
    processUploadedFile,
};
