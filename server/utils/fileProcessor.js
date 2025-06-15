// utils/fileProcessor.js

const path = require("path");
const fs = require("fs");
const logger = require("../utils/logger");

// Ensure "transcriptions" directory exists
const transcriptionDir = path.join(__dirname, "../transcriptions");
if (!fs.existsSync(transcriptionDir)) {
    fs.mkdirSync(transcriptionDir, { recursive: true });
}

const saveTranscriptionToFile = (
    filename,
    transcriptText,
    fileModifiedDate
) => {
    try {
        const originalName = path.parse(filename).name;
        const transcriptionFileName = `${originalName} - ${fileModifiedDate}.txt`;
        logger.info(
            `[saveTranscriptionToFile] => FileName: ${transcriptionFileName}`
        );
        const transcriptionFilePath = path.join(
            transcriptionDir,
            transcriptionFileName
        );

        if (!fs.existsSync(path.dirname(transcriptionFilePath))) {
            fs.mkdirSync(path.dirname(transcriptionFilePath), {
                recursive: true,
            });
        }

        fs.writeFileSync(transcriptionFilePath, transcriptText, "utf8");

        logger.info(
            `[saveTranscriptionToFile] => Transcription saved to: ${transcriptionFilePath}`
        );

        return transcriptionFilePath;
    } catch (error) {
        logger.error(
            `[saveTranscriptionToFile] => Error saving transcription: ${error.message}`
        );

        throw error;
    }
};

module.exports = {
    saveTranscriptionToFile,
};
