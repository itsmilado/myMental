// utils/assemblyaiHistory.js
const axios = require("axios");
const logger = require("../utils/logger");
const { getBackupsByTranscriptIdsQuery } = require("../db/transcribeQueries");
const { log } = require("winston");
const { Console } = require("winston/lib/winston/transports");

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

const fetchAssemblyTranscriptIds = async () => {
    const headers = {
        authorization: process.env.ASSEMBLYAI_API_KEY,
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

const buildHistoryResponseFromBackups = ({ historyIds, backups }) => {
    const backupMap = new Map(backups.map((b) => [b.transcript_id, b]));

    // Exclude anything not present in backups (prevents incomplete rows + enforces local availability)
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
                    file_recorded_at: backupRow.file_recorded_at ?? null,

                    // avoid stale data
                    audio_duration: formatDurationMMSS(
                        transcriptObject?.audio_duration,
                    ),
                    speech_model: null,
                    language: null,
                    transcription: "",
                    utterances: null,
                };
            }

            // If raw data is missing or malformed, still return minimal info.
            const transcriptionText = transcriptObject
                ? flattenTranscription(transcriptObject)
                : "";

            const utterances = transcriptObject
                ? extractUtterances(transcriptObject)
                : null;

            return {
                transcript_id: h.transcript_id,
                created_at: h.created_at || "",

                status: transcriptObject?.status ?? h.status ?? null,

                audio_url: transcriptObject?.audio_url ?? null,
                audio_duration: formatDurationMMSS(
                    transcriptObject?.audio_duration,
                ),

                speech_model: transcriptObject?.speech_model ?? null,
                language: transcriptObject?.language_code ?? null,

                transcription: transcriptionText,
                utterances,

                file_name: backupRow.file_name ?? null,
                file_recorded_at: backupRow.file_recorded_at ?? null,
            };
        })
        .filter(Boolean);
};

/**
 * Fetch AssemblyAI history for the logged in user:
 * - 1x AssemblyAI list (ids)
 * - 1x DB lookup (scoped)
 * - returns hydrated objects (from raw_api_data)
 */
const fetchAssemblyHistory = async ({ user }) => {
    if (!user?.id) {
        throw new Error("fetchAssemblyHistory requires a logged-in user");
    }

    try {
        const historyIds = await fetchAssemblyTranscriptIds();
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
            `[assemblyaiHistory] Error building AssemblyAI history: ${error.message}`,
        );
        throw error;
    }
};

module.exports = {
    fetchAssemblyHistory,
};
