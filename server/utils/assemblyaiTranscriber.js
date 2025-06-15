// utils/assemblyaiTranscriber.js

const logger = require("./logger");
const { assemblyClient } = require("../utils/assemblyaiClient");

// Default transcription options
// const transcriptionOptions = {
//     speaker_labels: true,
//     speakers_expected: 2,
//     sentiment_analysis: false,
//     speech_model: "slam-1",
//     language_code: "en",
//     format_text: true,
//     entity_detection: true,
// };

// Request transcription from AssemblyAI
const requestTranscription = async (transcriptionOptions) => {
    try {
        const transcript = await assemblyClient.transcripts.transcribe(
            transcriptionOptions
        );

        if (!transcript || !transcript.id) {
            throw new Error("Error requesting transcription");
        }

        logger.info(
            `[requestTranscription] => Transcription requested successfully, ID: ${transcript.id}`
        );
        return transcript.id;
    } catch (error) {
        logger.error(`[requestTranscription] => Error: ${error.message}`);
        throw error;
    }
};

// Poll for transcription result
const pollTranscriptionResult = async (transcriptId) => {
    try {
        let transcript;
        while (true) {
            transcript = await assemblyClient.transcripts.get(transcriptId);
            if (transcript.status === "completed") {
                logger.info(
                    `[pollTranscriptionResult] => Transcription completed and fetched`
                );
                return transcript;
            } else if (transcript.status === "failed") {
                throw new Error("Transcription failed");
            }
            await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait 5s before polling again
        }
    } catch (error) {
        logger.error(
            `[pollTranscriptionResult] => Error polling transcription: ${error.message}`
        );
        throw error;
    }
};

module.exports = {
    requestTranscription,
    pollTranscriptionResult,
};
