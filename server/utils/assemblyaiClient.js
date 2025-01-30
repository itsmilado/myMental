// utils/assemblyaiClient.js

const axios = require("axios");
const fs = require("fs").promises;
const { AssemblyAI } = require("assemblyai");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

// Initialize AssemblyAI client
const assemblyClient = new AssemblyAI({
    apiKey: process.env.ASSEMBLYAI_API_KEY,
});

// Define default transcription options
const transcriptionOptions = {
    speaker_labels: true,
    speakers_expected: 2,
    sentiment_analysis: true,
    speech_model: "nano",
    language_code: "en",
    return_word_timestamps: false,
    // more other options as needed
};

const transcribeAudio = async (audioUrl) => {
    try {
        // Merge the audio URL with the transcription options
        const transcriptOptions = {
            audio_url: audioUrl,
            ...transcriptionOptions,
        };

        // Create the transcript
        const transcript = await assemblyClient.transcripts.create(
            transcriptOptions
        );

        return transcript;
    } catch (error) {
        console.error("Error creating transcript:", error);
        throw error;
    }
};

const assemblyClientUpload = async (filePath) => {
    const baseUrl = "https://api.assemblyai.com/v2/upload";
    const headers = {
        "content-type": "application/octet-stream",
        authorization: process.env.ASSEMBLYAI_API_KEY,
    };
    try {
        const audioData = await fs.readFile(filePath);
        const response = await axios.post(baseUrl, audioData, {
            headers,
        });

        return response.data;
    } catch (error) {
        console.error("Error uploading audio to api:", error);
        throw error;
    }
};

module.exports = {
    assemblyClientUpload,
    assemblyClient,
    transcribeAudio,
    transcriptionOptions, // Exporting for potential external modifications
};
