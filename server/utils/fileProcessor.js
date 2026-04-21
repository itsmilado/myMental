// utils/fileProcessor.js

const path = require("path");
const fs = require("fs");
const logger = require("../utils/logger");

/*
- purpose: delete a locally stored uploaded audio file copy
- inputs: original uploaded file name
- outputs: none
- important behavior:
  - targets the uploads directory
  - skips missing files without throwing
  - logs success, skip, and error cases
*/
const deleteAudioFileCopy = (fileName) => {
    try {
        const uploadDir = path.join(__dirname, "../uploads");
        const audioPath = path.join(uploadDir, fileName);
        if (fs.existsSync(audioPath)) {
            // Delete the uploaded audio copy.
            fs.unlinkSync(audioPath);
            logger.info(
                `[deleteAudioFileCopy] Deleted audio file copy: ${audioPath}`,
            );

            // Skip silently when the local file is already gone.
        } else {
            logger.info(
                `[deleteAudioFileCopy] Audio file not found, skipping: ${audioPath}`,
            );
        }
    } catch (error) {
        logger.error(
            `[deleteAudioFileCopy] Error deleting audio file: ${error.message}`,
        );
    }
};

module.exports = {
    deleteAudioFileCopy,
};
