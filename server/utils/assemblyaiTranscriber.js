// utils/assemblyaiTranscriber.js

const logger = require("./logger");
const { assemblyClient } = require("../utils/assemblyaiClient");

/**
- Builds AssemblyAI-compatible transcription request
- Maps internal speaker_identification schema to speech_understanding structure
*/
const buildAssemblyAiTranscriptionRequest = (transcriptionOptions = {}) => {
    const request = {
        ...transcriptionOptions,
    };

    // speaker_identification is not a top-level AssemblyAI field
    delete request.speaker_identification;

    //AssemblyAI Speaker Identification requires diarization (speaker_labels)
    //speech_understanding is ignored if speaker_labels is false
    //known_values replaces legacy speakers array

    if (transcriptionOptions?.speaker_identification?.enabled) {
        const knownValues = Array.isArray(
            transcriptionOptions.speaker_identification.known_values,
        )
            ? transcriptionOptions.speaker_identification.known_values
                  .map((value) => String(value).trim())
                  .filter(Boolean)
            : undefined;

        // API requirement: identification depends on diarization
        request.speaker_labels = true;

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
