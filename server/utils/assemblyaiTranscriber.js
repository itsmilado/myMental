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

/*
- purpose: submit a normalized transcription request to AssemblyAI
- inputs: transcription options payload, optional AssemblyAI client instance
- outputs: AssemblyAI transcript creation response
- important behavior:
  - logs only safe request metadata without exposing audio urls or full payload bodies
  - rethrows upstream errors unchanged so handler behavior remains intact
*/
const requestTranscription = async (
    transcriptionOptions,
    client = assemblyClient,
) => {
    try {
        const assemblyRequest =
            buildAssemblyAiTranscriptionRequest(transcriptionOptions);

        const transcript = await client.transcripts.submit(assemblyRequest);

        logger.info(
            `[assemblyaiTranscriber.requestTranscription] => submit transcript: success | ${JSON.stringify(
                {
                    transcriptId: transcript?.id || null,
                    status: transcript?.status || null,
                },
            )}`,
        );

        return transcript;
    } catch (error) {
        logger.error(
            `[assemblyaiTranscriber.requestTranscription] => submit transcript: failed | ${JSON.stringify(
                {
                    error: error.message,
                },
            )}`,
        );
        throw error;
    }
};

/*
- purpose: poll AssemblyAI until a transcript reaches a terminal state
- inputs: transcript id, optional AssemblyAI client instance, polling interval in milliseconds
- outputs: completed transcript payload
- important behavior:
  - rethrows polling errors unchanged so upstream handlers keep current behavior
*/
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
                    `[assemblyaiTranscriber.pollTranscriptionResult] => poll transcript: success | ${JSON.stringify(
                        {
                            transcriptId,
                            status: transcript.status,
                        },
                    )}`,
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
            `[assemblyaiTranscriber.pollTranscriptionResult] => poll transcript: failed | ${JSON.stringify(
                {
                    transcriptId,
                    error: error.message,
                },
            )}`,
        );
        throw error;
    }
};

module.exports = {
    requestTranscription,
    pollTranscriptionResult,
};
