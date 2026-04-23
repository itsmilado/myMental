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
                `[fileProcessor.deleteAudioFileCopy] => delete audio file copy: success | ${JSON.stringify(
                    {
                        resourceId: fileName,
                    },
                )}`,
            );

            // Skip silently when the local file is already gone.
        } else {
            logger.info(
                `[fileProcessor.deleteAudioFileCopy] => delete audio file copy: denied | ${JSON.stringify(
                    {
                        resourceId: fileName,
                        reason: "audio_file_not_found",
                    },
                )}`,
            );
        }
    } catch (error) {
        logger.error(
            `[fileProcessor.deleteAudioFileCopy] => delete audio file copy: failed | ${JSON.stringify(
                {
                    resourceId: fileName,
                    error: error.message,
                },
            )}`,
        );
    }
};

module.exports = {
    deleteAudioFileCopy,
};
