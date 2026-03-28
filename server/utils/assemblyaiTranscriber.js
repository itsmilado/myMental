// utils/assemblyaiTranscriber.js

const logger = require("./logger");
const { assemblyClient } = require("../utils/assemblyaiClient");

const buildAssemblyAiTranscriptionRequest = (transcriptionOptions = {}) => {
    const request = {
        ...transcriptionOptions,
    };

    delete request.speaker_identification;

    if (transcriptionOptions?.speaker_identification?.enabled) {
        const speakers = Array.isArray(
            transcriptionOptions.speaker_identification.speakers,
        )
            ? transcriptionOptions.speaker_identification.speakers
                  .map((value) => String(value).trim())
                  .filter(Boolean)
            : undefined;

        request.speech_understanding = {
            request: {
                speaker_identification: {
                    speaker_type:
                        transcriptionOptions.speaker_identification
                            .speaker_type ?? "name",
                    ...(speakers && speakers.length > 0 ? { speakers } : {}),
                },
            },
        };
    }

    return request;
};

// Request transcription from AssemblyAI
const requestTranscription = async (transcriptionOptions) => {
    try {
        const assemblyRequest =
            buildAssemblyAiTranscriptionRequest(transcriptionOptions);

        const transcript =
            await assemblyClient.transcripts.transcribe(assemblyRequest);

        if (!transcript || !transcript.id) {
            throw new Error("Error requesting transcription");
        }

        logger.info(
            `[requestTranscription] => Transcription requested successfully, ID: ${transcript.id}`,
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
                    `[pollTranscriptionResult] => Transcription completed and fetched`,
                );
                return transcript;
            } else if (transcript.status === "failed") {
                throw new Error("Transcription failed");
            }
            await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait 5s before polling again
        }
    } catch (error) {
        logger.error(
            `[pollTranscriptionResult] => Error polling transcription: ${error.message}`,
        );
        throw error;
    }
};

module.exports = {
    requestTranscription,
    pollTranscriptionResult,
};
