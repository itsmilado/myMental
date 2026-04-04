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
    connectionLabel: string | null;
    connectionSourceLabel: string | null;
    speechModelLabel: string | null;
    languageLabel: string | null;
    prompt: string | null;
    speakerModeLabel: string | null;
    speakersExpected: number | null;
    knownSpeakerValues: string[];
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
- Builds a readable speech model label from mixed online/offline payload shapes
*/
const getSpeechModelLabel = (
    speechModel?: string | null,
    speechModels?: string[] | null,
): string | null => {
    if (speechModel) return speechModel;
    if (Array.isArray(speechModels) && speechModels.length > 0) {
        return speechModels.join(", ");
    }
    return null;
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
        connectionLabel: transcription.assemblyai_connection_label ?? null,
        connectionSourceLabel: formatConnectionSource(
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
        speakersExpected: options.speakers_expected ?? null,
        knownSpeakerValues: knownValues.filter(Boolean),
    };
};

/*
- Normalizes AssemblyAI history metadata for sidebar rendering
*/
export const normalizeOnlineHistoryMetadata = (
    transcription: OnlineTranscription,
): NormalizedHistoryMetadata => {
    return {
        sourceLabel: "AssemblyAI History",
        connectionLabel: transcription.assemblyai_connection_label ?? null,
        connectionSourceLabel: formatConnectionSource(
            transcription.assemblyai_connection_source,
        ),
        speechModelLabel: getSpeechModelLabel(
            transcription.speech_model ?? null,
            transcription.speech_models ?? null,
        ),
        languageLabel: transcription.language ?? null,
        prompt: null,
        speakerModeLabel: transcription.utterances?.length
            ? "Speaker labels"
            : null,
        speakersExpected: null,
        knownSpeakerValues: [],
    };
};
