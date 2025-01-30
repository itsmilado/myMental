const path = require("path");
const fs = require("fs");

const processUploadedFile = (file) => {
    const filePath = file.path;
    const filename = file.processedName;
    const file_recorded_at = getFileModifiedDate(file.path);
    const formattedDate = file_recorded_at.split("T")[0];

    return { filePath, filename, file_recorded_at, formattedDate };
};

const saveTranscriptionToFile = (filename, formattedDate, transcriptText) => {
    const transcriptionFilename = `${
        path.parse(filename).name
    }_${formattedDate}.txt`;
    const transcriptionFilePath = path.join(
        __dirname,
        "../transcriptions",
        transcriptionFilename
    );

    if (!fs.existsSync(path.dirname(transcriptionFilePath))) {
        fs.mkdirSync(path.dirname(transcriptionFilePath), { recursive: true });
    }

    fs.writeFileSync(transcriptionFilePath, transcriptText);
    return transcriptionFilePath;
};

// Helper function to store modified Date

const getFileModifiedDate = (filePath) => {
    const stats = fs.statSync(filePath);
    return stats.mtime;
};

module.exports = {
    processUploadedFile,
    saveTranscriptionToFile,
};
