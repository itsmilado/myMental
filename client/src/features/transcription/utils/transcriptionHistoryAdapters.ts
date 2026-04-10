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
    TranscriptionOptions,
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
- Normalizes Project labels so online and offline views use the same fallback wording.
- Inputs: stored label plus connection source metadata.
- Outputs: user-facing Project label or null when no project context exists.
- Important behavior: unlabeled default/app-fallback records still render predictably.
*/
const getProjectLabel = ({
    label,
    source,
}: {
    label?: string | null;
    source?: TranscriptionConnectionMetadata["assemblyai_connection_source"];
}): string | null => {
    const trimmedLabel = String(label || "").trim();

    if (trimmedLabel) {
        return trimmedLabel;
    }

    if (source === "default_connection") {
        return "Default key";
    }

    if (source === "app_fallback") {
        return "App fallback";
    }

    return null;
};

/*
- Normalizes backend/frontend speech model variants into one display label.
- Inputs: singular model field plus plural model array from any supported shape.
- Outputs: one display-safe speech model label or null.
- Important behavior: trims values and supports both legacy and current naming.
*/
const getSpeechModelLabel = (
    speechModel?: string | null,
    speechModels?: string[] | null,
): string | null => {
    const normalizedSingle = String(speechModel || "").trim();
    const normalizedFromArray =
        Array.isArray(speechModels) && speechModels.length > 0
            ? String(speechModels[0] || "").trim()
            : "";

    const rawModel = normalizedSingle || normalizedFromArray;

    if (!rawModel) return null;
    if (rawModel === "universal-pro-3") return "universal-3-pro";

    return rawModel;
};

/*
- Filters stored speaker values into a clean display list.
- Inputs: optional array of stored known speaker values.
- Outputs: trimmed, non-empty speaker names.
- Important behavior: protects detail views from legacy empty-string values.
*/
const getKnownSpeakerValues = (values?: string[] | null): string[] => {
    if (!Array.isArray(values)) return [];

    return values.map((value) => String(value || "").trim()).filter(Boolean);
};

/*
- Normalizes offline/local transcription metadata for detail rendering.
- Inputs: one stored app transcription record.
- Outputs: shared metadata shape for offline detail consumers.
- Important behavior: uses persisted options as the authoritative source.
*/
export const normalizeOfflineHistoryMetadata = (
    transcription: TranscriptData,
): NormalizedHistoryMetadata => {
    const options = transcription.options ?? {};
    const knownValues = getKnownSpeakerValues(
        options.speaker_identification?.known_values,
    );

    return {
        sourceLabel: "My Transcription",
        projectLabel: getProjectLabel({
            label: transcription.assemblyai_connection_label,
            source: transcription.assemblyai_connection_source,
        }),
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
        knownSpeakerValues: knownValues,
        recordedAtLabel: transcription.file_recorded_at ?? null,
        transcribedAtLabel: transcription.created_at ?? null,
    };
};

/*
- Normalizes AssemblyAI history metadata for sidebar rendering.
- Inputs: one online history row, including any backup-derived nested data.
- Outputs: shared metadata shape for online sidebar consumers.
- Important behavior: falls back through top-level and nested option-like shapes
  so online history can resolve the same speech model shown in offline history.
*/
export const normalizeOnlineHistoryMetadata = (
    transcription: OnlineTranscription,
): NormalizedHistoryMetadata => {
    const nestedOptions = transcription as OnlineTranscription & {
        options?: Partial<TranscriptionOptions> | null;
        transcript?: {
            speech_model?: string | null;
            speech_models?: string[] | null;
            language_code?: string | null;
        } | null;
        raw?: {
            transcript?: {
                speech_model?: string | null;
                speech_models?: string[] | null;
                language_code?: string | null;
            } | null;
        } | null;
    };

    const speechModelLabel = getSpeechModelLabel(
        transcription.speech_model ??
            nestedOptions.transcript?.speech_model ??
            nestedOptions.raw?.transcript?.speech_model ??
            null,
        transcription.speech_models ??
            nestedOptions.options?.speech_models ??
            nestedOptions.transcript?.speech_models ??
            nestedOptions.raw?.transcript?.speech_models ??
            null,
    );

    const normalizedPrompt = String(
        transcription.prompt ?? nestedOptions.options?.prompt ?? "",
    ).trim();

    const normalizedLanguage = String(
        transcription.language ??
            nestedOptions.options?.language_code ??
            nestedOptions.transcript?.language_code ??
            nestedOptions.raw?.transcript?.language_code ??
            "",
    ).trim();

    return {
        sourceLabel: "AssemblyAI History",
        projectLabel: transcription.assemblyai_connection_label ?? null,
        projectSourceLabel: formatConnectionSource(
            transcription.assemblyai_connection_source,
        ),
        speechModelLabel,
        languageLabel: normalizedLanguage || null,
        prompt:
            speechModelLabel === "universal-3-pro"
                ? normalizedPrompt || null
                : null,
        speakerModeLabel: transcription.utterances?.length
            ? "Speaker labels"
            : null,
        knownSpeakerValues: [],
        recordedAtLabel: transcription.file_recorded_at ?? null,
        transcribedAtLabel: transcription.created_at ?? null,
    };
};
