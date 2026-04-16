// utils/assemblyaiTranscriber.js

const logger = require("./logger");
const { assemblyClient } = require("../utils/assemblyaiClient");

/*
 - Removes undefined properties from an object so the final request
 - stays minimal and matches the documented AssemblyAI schema.
 */
const removeUndefinedEntries = (value = {}) => {
    return Object.fromEntries(
        Object.entries(value).filter(
            ([, entryValue]) => entryValue !== undefined,
        ),
    );
};

/*
 - Normalizes known speaker values used for speaker identification.
 */
const sanitizeKnownValues = (knownValues) => {
    if (!Array.isArray(knownValues)) {
        return [];
    }

    return knownValues.map((value) => String(value).trim()).filter(Boolean);
};

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

    const speakerIdentification = transcriptionOptions?.speaker_identification;
    const identificationEnabled = Boolean(speakerIdentification?.enabled);

    // Remove app-only / invalid top-level fields before building final payload
    delete request.speaker_identification;

    if (identificationEnabled) {
        const knownValues = sanitizeKnownValues(
            speakerIdentification.known_values,
        );

        request.speaker_labels = true;

        // Important: do NOT send speakers_expected when speaker identification is enabled
        delete request.speakers_expected;

        request.speech_understanding = {
            request: {
                speaker_identification: removeUndefinedEntries({
                    speaker_type: speakerIdentification.speaker_type || "name",
                    known_values:
                        knownValues.length > 0 ? knownValues : undefined,
                }),
            },
        };
    }

    return removeUndefinedEntries(request);
};

/**
- Sends transcription request to AssemblyAI and returns transcript ID
*/
const requestTranscription = async (
    transcriptionOptions,
    client = assemblyClient,
) => {
    try {
        const assemblyRequest =
            buildAssemblyAiTranscriptionRequest(transcriptionOptions);

        logger.info(
            `[assemblyaiTranscriber.requestTranscription] => submitting transcript request: ${JSON.stringify(
                {
                    ...assemblyRequest,
                    audio_url: assemblyRequest.audio_url
                        ? "[redacted]"
                        : undefined,
                },
            )}`,
        );

        const transcript = await client.transcripts.submit(assemblyRequest);

        return transcript;
    } catch (error) {
        logger.error(
            `[assemblyaiTranscriber.requestTranscription] => failed to submit transcript: ${error.message}`,
        );
        throw error;
    }
};

// Poll for transcription result
const pollTranscriptionResult = async (
    transcriptId,
    client = assemblyClient,
    intervalMs = 3000,
) => {
    try {
        let transcript;
        while (true) {
            transcript = await client.transcripts.get(transcriptId);
            if (transcript.status === "completed") {
                logger.info(
                    `[pollTranscriptionResult] => Transcription completed and fetched`,
                );
                return transcript;
            }
            if (transcript.status === "error") {
                throw new Error(
                    transcript.error || "AssemblyAI transcription failed.",
                );
            }

            await new Promise((resolve) => setTimeout(resolve, intervalMs));
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
