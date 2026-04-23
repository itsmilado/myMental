// utils/assemblyaiHistory.js

const axios = require("axios");
const logger = require("../utils/logger");

const { getBackupsByTranscriptIdsQuery } = require("../db/transcribeQueries");

const {
    resolveAssemblyHistoryWithFallback,
} = require("../utils/assemblyaiConnectionResolver");

const ASSEMBLY_LIST_URL =
    "https://api.eu.assemblyai.com/v2/transcript?limit=200";

const safeParseRaw = (raw) => {
    if (!raw) return null;

    if (typeof raw === "string") {
        try {
            return JSON.parse(raw);
        } catch {
            return null;
        }
    }
    return raw;
};

const formatDurationMMSS = (seconds) => {
    if (typeof seconds !== "number" || Number.isNaN(seconds)) return null;
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${String(s).padStart(2, "0")}`;
};

/*
- Resolves one speech model label from an AssemblyAI transcript object.
- Inputs: parsed transcript object from backup raw data.
- Outputs: first speech model string or legacy fallback value.
- Important behavior: prefers array-based speech_models to match current app storage.
*/
const getSpeechModelFromTranscript = (transcriptObject) => {
    if (!transcriptObject || typeof transcriptObject !== "object") {
        return null;
    }

    if (
        Array.isArray(transcriptObject.speech_models) &&
        transcriptObject.speech_models.length > 0
    ) {
        const firstModel = String(
            transcriptObject.speech_models[0] || "",
        ).trim();

        return firstModel || null;
    }

    const legacyModel = String(transcriptObject.speech_model || "").trim();
    return legacyModel || null;
};

/*
- Resolves a normalized prompt value from an AssemblyAI transcript object.
- Inputs: parsed transcript object from backup raw data.
- Outputs: trimmed prompt string or null.
- Important behavior: keeps prompt available for universal-3-pro metadata rendering.
*/
const getPromptFromTranscript = (transcriptObject) => {
    if (!transcriptObject || typeof transcriptObject !== "object") {
        return null;
    }

    const prompt = String(transcriptObject.prompt || "").trim();
    return prompt || null;
};

// Normalize utterances so the frontend can render speaker blocks + timestamps reliably
const extractUtterances = (transcriptObject) => {
    const utterances = transcriptObject?.utterances;

    if (!Array.isArray(utterances) || utterances.length === 0) return null;

    return utterances.map((u) => ({
        speaker: u?.speaker ?? null,
        text: u?.text ?? "",
        start: u?.start ?? null,
        end: u?.end ?? null,
    }));
};

/*
- Normalizes AssemblyAI word timing into a frontend-safe shape.
- Inputs: parsed transcript object from backup raw data.
- Outputs: ordered word array with text/start/end or null when unavailable.
- Important behavior: filters out invalid timing entries so playback sync logic 
  only receives usable timed words.
*/
const extractWords = (transcriptObject) => {
    const words = transcriptObject?.words;

    if (!Array.isArray(words) || words.length === 0) return null;

    const normalizedWords = words
        .map((word) => {
            const text = String(word?.text ?? "").trim();
            const start = typeof word?.start === "number" ? word.start : null;
            const end = typeof word?.end === "number" ? word.end : null;

            if (!text || start === null || end === null) {
                return null;
            }

            return {
                text,
                start,
                end,
                confidence:
                    typeof word?.confidence === "number"
                        ? word.confidence
                        : null,
                speaker: word?.speaker ?? null,
            };
        })
        .filter(Boolean);

    return normalizedWords.length > 0 ? normalizedWords : null;
};

// Best-effort flattening from AssemblyAI transcript object
const flattenTranscription = (transcript) => {
    if (!transcript) return "";

    // AssemblyAI can return utterances if speaker_labels enabled
    if (Array.isArray(transcript.utterances) && transcript.utterances.length) {
        return transcript.utterances
            .map((u) => {
                const speaker =
                    u.speaker != null ? `Speaker ${u.speaker}` : null;
                const text = (u.text || "").trim();
                if (!text) return null;
                return speaker ? `${speaker}: ${text}` : text;
            })
            .filter(Boolean)
            .join("\n");
    }

    if (typeof transcript.text === "string") return transcript.text;

    return "";
};

const fetchAssemblyTranscriptIdsWithKey = async (apiKey) => {
    const headers = {
        authorization: apiKey,
    };

    const response = await axios.get(ASSEMBLY_LIST_URL, { headers });

    const transcripts =
        response?.data?.transcripts ||
        response?.data?.results ||
        (Array.isArray(response?.data) ? response.data : null);

    if (!Array.isArray(transcripts)) {
        throw new Error("Unexpected AssemblyAI transcript list response shape");
    }

    return transcripts
        .map((t) => {
            const id = t?.id || t?.transcript_id;
            if (!id) return null;
            return {
                transcript_id: id,
                created_at: t?.created ? String(t.created) : "",
                status: t?.status ?? null,
                audio_url: t?.audio_url ?? null,
            };
        })
        .filter(Boolean);
};

/*
- Builds the online history payload from AssemblyAI ids plus local backup rows.
- Inputs: AssemblyAI history ids/statuses and matched local backups.
- Outputs: sidebar-ready online history rows for the frontend.
- Important behavior: backup raw_api_data is the metadata source of truth for
  speech model, prompt, utterances, and local file metadata.
*/
const buildHistoryResponseFromBackups = ({ historyIds, backups }) => {
    const backupMap = new Map(backups.map((b) => [b.transcript_id, b]));

    return historyIds
        .map((h) => {
            const backupRow = backupMap.get(h.transcript_id);
            if (!backupRow) return null;

            const raw = safeParseRaw(backupRow.raw_api_data);
            const transcriptObject = raw?.transcript ?? raw;

            const isDeletedByUser = h.audio_url === "deleted_by_user";

            if (isDeletedByUser) {
                return {
                    transcript_id: h.transcript_id,
                    created_at: h.created_at || "",

                    status: h.status,
                    audio_url: "http://deleted_by_user",

                    // keep file metadata
                    file_name: backupRow.file_name ?? null,
                    category: backupRow.category ?? null,
                    file_recorded_at: backupRow.file_recorded_at ?? null,
                    assemblyai_connection_id:
                        backupRow.assemblyai_connection_id ?? null,
                    assemblyai_connection_label:
                        backupRow.assemblyai_connection_label ?? null,
                    assemblyai_connection_source:
                        backupRow.assemblyai_connection_source ??
                        "legacy_unknown",

                    // avoid stale data
                    audio_duration: formatDurationMMSS(
                        transcriptObject?.audio_duration,
                    ),
                    speech_model:
                        getSpeechModelFromTranscript(transcriptObject),
                    speech_models:
                        Array.isArray(transcriptObject?.speech_models) &&
                        transcriptObject.speech_models.length > 0
                            ? transcriptObject.speech_models
                            : getSpeechModelFromTranscript(transcriptObject)
                              ? [getSpeechModelFromTranscript(transcriptObject)]
                              : null,
                    prompt: getPromptFromTranscript(transcriptObject),
                    language: transcriptObject?.language_code ?? null,
                    transcription: "",
                    utterances: null,
                    words: null,
                };
            }

            // If raw data is missing or malformed, still return minimal info.
            const transcriptionText = transcriptObject
                ? flattenTranscription(transcriptObject)
                : "";

            const utterances = transcriptObject
                ? extractUtterances(transcriptObject)
                : null;

            const words = transcriptObject
                ? extractWords(transcriptObject)
                : null;

            return {
                transcript_id: h.transcript_id,
                created_at: h.created_at || "",

                status: transcriptObject?.status ?? h.status ?? null,

                audio_url: transcriptObject?.audio_url ?? null,
                audio_duration: formatDurationMMSS(
                    transcriptObject?.audio_duration,
                ),

                speech_model: getSpeechModelFromTranscript(transcriptObject),
                speech_models:
                    Array.isArray(transcriptObject?.speech_models) &&
                    transcriptObject.speech_models.length > 0
                        ? transcriptObject.speech_models
                        : getSpeechModelFromTranscript(transcriptObject)
                          ? [getSpeechModelFromTranscript(transcriptObject)]
                          : null,
                prompt: getPromptFromTranscript(transcriptObject),
                language: transcriptObject?.language_code ?? null,

                transcription: transcriptionText,
                utterances,
                words,

                file_name: backupRow.file_name ?? null,
                category: backupRow.category ?? null,
                file_recorded_at: backupRow.file_recorded_at ?? null,
                assemblyai_connection_id:
                    backupRow.assemblyai_connection_id ?? null,
                assemblyai_connection_label:
                    backupRow.assemblyai_connection_label ?? null,
                assemblyai_connection_source:
                    backupRow.assemblyai_connection_source ?? "legacy_unknown",
            };
        })
        .filter(Boolean);
};

/**
 - Fetch AssemblyAI history for the logged in user:
 - 1x AssemblyAI list (ids)
 - 1x DB lookup (scoped)
 - returns hydrated objects (from raw_api_data)
 */
const fetchAssemblyHistory = async ({ user }) => {
    if (!user?.id) {
        throw new Error("fetchAssemblyHistory requires a logged-in user");
    }

    try {
        /*
        Resolve transcript list using the shared AssemblyAI connection resolver
        so history probing follows the same deterministic ordering as the rest
        of the backend.
        */
        const historyIds = await resolveAssemblyHistoryWithFallback({
            user_id: user.id,
            fetchWithApiKey: fetchAssemblyTranscriptIdsWithKey,
        });

        const transcriptIds = historyIds.map((h) => h.transcript_id);

        if (transcriptIds.length === 0) return [];

        const isAdmin = String(user.role || "").toLowerCase() === "admin";

        const backups = await getBackupsByTranscriptIdsQuery({
            transcriptIds,
            user_id: user.id,
            isAdmin,
        });

        return buildHistoryResponseFromBackups({ historyIds, backups });
    } catch (error) {
        logger.error(
            `[assemblyaiHistory.fetchAssemblyHistory] => building AssemblyAI history: failed | ${JSON.stringify(
                {
                    error: error.message,
                },
            )}`,
        );
        throw error;
    }
};

module.exports = {
    fetchAssemblyHistory,
};
