// utils/assemblyaiTranscriber.js

const logger = require("./logger");
const { assemblyClient } = require("../utils/assemblyaiClient");

/*
- Builds the final AssemblyAI transcription request.
- Inputs: normalized app-level transcription options.
- Outputs: AssemblyAI-compatible request payload.
- Important behavior: strips fields that are valid in local UI state but invalid in the final identification request schema.
*/
const buildAssemblyAiTranscriptionRequest = (transcriptionOptions = {}) => {
    const request = {
        ...transcriptionOptions,
    };

    delete request.speaker_identification;

    if (transcriptionOptions?.speaker_identification?.enabled) {
        const knownValues = Array.isArray(
            transcriptionOptions.speaker_identification.known_values,
        )
            ? transcriptionOptions.speaker_identification.known_values
                  .map((value) => String(value).trim())
                  .filter(Boolean)
            : undefined;

        request.speaker_labels = true;
        delete request.speakers_expected;

        request.speech_understanding = {
            request: {
                speaker_identification: {
                    speaker_type:
                        transcriptionOptions.speaker_identification
                            .speaker_type ?? "name",
                    ...(knownValues && knownValues.length > 0
                        ? { known_values: knownValues }
                        : {}),
                },
            },
        };
    }

    return request;
};

/**
- Sends transcription request to AssemblyAI and returns transcript ID
*/
const requestTranscription = async (transcriptionOptions) => {
    try {
        const assemblyRequest =
            buildAssemblyAiTranscriptionRequest(transcriptionOptions);

        logger.info(
            `[requestTranscription] => AssemblyAI request: ${JSON.stringify({
                ...assemblyRequest,
                audio_url: assemblyRequest.audio_url ? "[redacted]" : undefined,
            })}`,
        );

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
