//src/features/transcription/utils/transcriptionHistoryAdapters.ts

/*
- Normalizes offline and online transcription records into a shared UI metadata shape
- Keeps legacy-safe fallbacks in one place
- Prevents history/detail components from duplicating schema reconciliation logic
*/

import type {
    OnlineTranscription,
    TranscriptData,
    TranscriptionConnectionMetadata,
} from "../../../types/types";

export type NormalizedHistoryMetadata = {
    sourceLabel: string;
    projectLabel: string | null;
    projectSourceLabel: string | null;
    speechModelLabel: string | null;
    languageLabel: string | null;
    prompt: string | null;
    speakerModeLabel: string | null;
    knownSpeakerValues: string[];
    recordedAtLabel: string | null;
    transcribedAtLabel: string | null;
};

const formatConnectionSource = (
    source: TranscriptionConnectionMetadata["assemblyai_connection_source"],
): string | null => {
    if (!source) return null;

    if (source === "selected_connection") return "Selected connection";
    if (source === "default_connection") return "Default connection";
    if (source === "app_fallback") return "App fallback";
    if (source === "legacy_unknown") return "Legacy / unknown";

    return source;
};

/*
- Normalizes backend/frontend speech model variants into one display label
- Maps AssemblyAI online history model naming to the app-facing label
*/
const getSpeechModelLabel = (
    speechModel?: string | null,
    speechModels?: string[] | null,
): string | null => {
    const rawModel =
        speechModel ||
        (Array.isArray(speechModels) && speechModels.length > 0
            ? speechModels[0]
            : null);

    if (!rawModel) return null;
    if (rawModel === "universal-pro-3") return "universal-3-pro";

    return rawModel;
};

/*
- Normalizes offline/local transcription metadata for detail rendering
*/
export const normalizeOfflineHistoryMetadata = (
    transcription: TranscriptData,
): NormalizedHistoryMetadata => {
    const options = transcription.options ?? {};
    const knownValues = options.speaker_identification?.known_values ?? [];

    return {
        sourceLabel: "My Transcription",
        projectLabel: transcription.assemblyai_connection_label ?? null,
        projectSourceLabel: formatConnectionSource(
            transcription.assemblyai_connection_source,
        ),
        speechModelLabel: getSpeechModelLabel(
            null,
            options.speech_models ?? null,
        ),
        languageLabel: options.language_code ?? null,
        prompt: options.prompt ?? null,
        speakerModeLabel: options.speaker_identification?.enabled
            ? "Speaker identification"
            : options.speaker_labels
              ? "Speaker labels"
              : null,
        knownSpeakerValues: knownValues.filter(Boolean),
        recordedAtLabel: transcription.file_recorded_at ?? null,
        transcribedAtLabel: transcription.created_at ?? null,
    };
};

/*
- Normalizes AssemblyAI history metadata for sidebar rendering
*/
export const normalizeOnlineHistoryMetadata = (
    transcription: OnlineTranscription,
): NormalizedHistoryMetadata => {
    const speechModelLabel = getSpeechModelLabel(
        transcription.speech_model ?? null,
        transcription.speech_models ?? null,
    );

    return {
        sourceLabel: "AssemblyAI History",
        projectLabel: transcription.assemblyai_connection_label ?? null,
        projectSourceLabel: formatConnectionSource(
            transcription.assemblyai_connection_source,
        ),
        speechModelLabel,
        languageLabel: transcription.language ?? null,
        prompt: speechModelLabel === "universal-3-pro" ? "" : null,
        speakerModeLabel: transcription.utterances?.length
            ? "Speaker labels"
            : null,
        knownSpeakerValues: [],
        recordedAtLabel: transcription.file_recorded_at ?? null,
        transcribedAtLabel: transcription.created_at ?? null,
    };
};
