// middleWares/transcriptionMiddleWare.js

const fs = require("fs");
const path = require("path");
const { processUploadedFile } = require("../utils/processUploadedFile");
const {
    assemblyClient,
    assemblyClientUpload,
    transcribeAudio,
} = require("../utils/assemblyaiClient");
const {
    insertTranscription,
    getAllTranscriptions,
    getTranscriptionByApiTranscriptId,
    getTranscriptionById,
} = require("../db/transcribeQueries");

const fetchAllTranscriptions = async (req, res) => {
    try {
        const transcriptions = await getAllTranscriptions();
        res.json(transcriptions);
    } catch (error) {
        console.error("Error fetching transcriptions:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

const createTranscription = async (req, res) => {
    try {
        // Handle file upload
        const { filePath, filename, fileRecordedAt, formattedDate } =
            processUploadedFile(req.file);

        // Upload the audio file to AssemblyAI
        const uploadResponse = await assemblyClientUpload(filePath);
        const uploadUrl = uploadResponse.upload_url;

        // Request a transcription using the transcribeAudio function
        const transcriptResponse = await transcribeAudio(uploadUrl);
        const transcriptId = transcriptResponse.id;

        // Poll AssemblyAI for the transcription result
        let transcript;
        while (true) {
            transcript = await assemblyClient.transcripts.get(transcriptId);
            if (transcript.status === "completed") {
                break;
            } else if (transcript.status === "failed") {
                throw new Error("Transcription failed");
            }
            await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait for 5 seconds before polling again
        }

        // Save transcription and metadata to the database

        let transcriptionText = "";
        for (let utterance of transcript.utterances) {
            transcriptionText += `Speaker ${utterance.speaker}: ${utterance.text}\n`;
        }
        console.log("Transcription utterance text(db):", transcriptionText);

        await insertTranscription(
            filename,
            transcriptionText,
            fileRecordedAt,
            transcriptId
        );

        // Define the path for the transcription text file
        const transcriptionFilename = `${
            path.parse(filename).name
        }_${formattedDate}.txt`;
        const transcriptionFilePath = path.join(
            __dirname,
            "../transcriptions",
            transcriptionFilename
        );

        // Ensure the transcriptions directory exists
        if (!fs.existsSync(path.dirname(transcriptionFilePath))) {
            fs.mkdirSync(path.dirname(transcriptionFilePath), {
                recursive: true,
            });
        }

        // Write the transcription to a text file
        fs.writeFileSync(transcriptionFilePath, transcriptionText);

        // Respond with the transcription and file details
        res.json({
            transcription: transcriptionText,
            transcriptionFile: transcriptionFilename,
            recordedAt: fileRecordedAt,
        });
    } catch (error) {
        console.error("Error during transcription:", error);
        res.status(500).json({
            error: "An error occurred during transcription",
        });
    }
};

const fetchTranscriptionById = async (req, res) => {
    const { id } = req.params;
    try {
        // Fetch the transcription by ID
        const transcription = await getTranscriptionById(id);
        if (!transcription) {
            return res.status(404).json({ message: "Transcription not found" });
        }
        res.json(transcription);
    } catch (error) {
        console.error("Error fetching transcription:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

const fetchTranscriptionByApiTranscriptId = async (req, res) => {
    const { transcriptId } = req.params;
    try {
        // Fetch the transcription by API transcript ID
        const transcription = await getTranscriptionByApiTranscriptId(
            transcriptId
        );
        if (!transcription) {
            return res.status(404).json({ message: "Transcription not found" });
        }
        res.json(transcription);
    } catch (error) {
        console.error("Error fetching transcription:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

const errorHandler = (err, req, res) => {
    err.status = err.status || 500;
    res.status(err.status).json({ message: err.message });
};

module.exports = {
    createTranscription,
    fetchAllTranscriptions,
    fetchTranscriptionById,
    fetchTranscriptionByApiTranscriptId,
    errorHandler,
};
