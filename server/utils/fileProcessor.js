// utils/fileProcessor.js

const path = require("path");
const fs = require("fs");
const logger = require("../utils/logger");

// Ensure "transcriptions" directory exists
const transcriptionDir = path.join(__dirname, "../transcriptions");
if (!fs.existsSync(transcriptionDir)) {
    fs.mkdirSync(transcriptionDir, { recursive: true });
}

const saveTranscriptionToFile = (filename, transcriptText) => {
    try {
        const originalName = path.parse(filename).name;
        const safeName = originalName.replace(/[^\w]+/g, "_");
        const transcriptionFileName = `${safeName}.txt`;
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

const getTranscriptionFilePath = (fileName) => {
    const originalName = path.parse(fileName).name;
    const safeName = originalName.replace(/[^\w]+/g, "_");
    const transcriptionFileName = `${safeName}.txt`;
    return path.join(transcriptionDir, transcriptionFileName);
};

const deleteTranscriptionTxtFile = (fileName) => {
    try {
        const transcriptionFilePath = getTranscriptionFilePath(fileName);
        if (fs.existsSync(transcriptionFilePath)) {
            fs.unlinkSync(transcriptionFilePath);
            logger.info(
                `[deleteTranscriptionTxtFile] Deleted transcription file: ${transcriptionFilePath}`
            );
        } else {
            logger.info(
                `[deleteTranscriptionTxtFile] File does not exist, skipping: ${transcriptionFilePath}`
            );
        }
    } catch (error) {
        logger.error(
            `[deleteTranscriptionTxtFile] Error deleting transcription file: ${error.message}`
        );
    }
};

const deleteAudioFileCopy = (fileName) => {
    try {
        const uploadDir = path.join(__dirname, "../uploads");
        const audioPath = path.join(uploadDir, fileName);
        if (fs.existsSync(audioPath)) {
            fs.unlinkSync(audioPath);
            logger.info(
                `[deleteAudioFileCopy] Deleted audio file copy: ${audioPath}`
            );
        } else {
            logger.info(
                `[deleteAudioFileCopy] Audio file not found, skipping: ${audioPath}`
            );
        }
    } catch (error) {
        logger.error(
            `[deleteAudioFileCopy] Error deleting audio file: ${error.message}`
        );
    }
};

module.exports = {
    saveTranscriptionToFile,
    deleteTranscriptionTxtFile,
    deleteAudioFileCopy,
};
