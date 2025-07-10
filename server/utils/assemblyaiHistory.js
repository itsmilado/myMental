// utils/assemblyaiHistory.js

const axios = require("axios");
const logger = require("../utils/logger");
const { pollTranscriptionResult } = require("./assemblyaiTranscriber");

const fetchAssemblyHistory = async () => {
    const baseUrl = "https://api.eu.assemblyai.com/v2/transcript?limit=20";
    const headers = {
        authorization: process.env.ASSEMBLYAI_API_KEY,
    };
    try {
        const response = await axios.get(baseUrl, { headers });
        if (!response.data) {
            throw new Error(
                "No transcripts found in AssemblyAI history response"
            );
        }

        const transcriptSummaries = response.data.transcripts.map((t) => ({
            id: t.id,
            created: t.created,
        }));
        const ids = transcriptSummaries.map((t) => t.id);

        // Fetch full detail for each transcript ID (in parallel)
        const results = await Promise.all(
            ids.map(async (id) => {
                try {
                    const createdAt =
                        transcriptSummaries.find((summary) => summary.id === id)
                            ?.created || "";
                    const transcript = await pollTranscriptionResult(id);
                    return {
                        createdAt,
                        transcript,
                    };
                } catch (err) {
                    logger.error(
                        `[assemblyaiHistory] => Error polling id ${id}: ${err.message}`
                    );
                    return null;
                }
            })
        );

        // Only keep successful ones
        const enriched = results.filter(Boolean).map((t) => ({
            transcript_id: t.transcript.id,
            created_at: t.createdAt || "",
            status: t.transcript.status,
            audio_url: t.transcript.audio_url,
            audio_duration: t.transcript.audio_duration
                ? `${Math.floor(t.transcript.audio_duration / 60)
                      .toString()
                      .padStart(2, "0")}:${Math.floor(
                      t.transcript.audio_duration % 60
                  )
                      .toString()
                      .padStart(2, "0")}`
                : "",
            speech_model: t.transcript.speech_model || "",
            language: t.transcript.language_code || "",
            transcript: t.transcript,
            features: [
                t.transcript.speaker_labels ? "speaker_labels" : null,
                t.transcript.sentiment_analysis ? "sentiment_analysis" : null,
                t.transcript.entity_detection ? "entity_detection" : null,
            ].filter(Boolean),
            // Any other fields you need...
        }));

        // Sort by created_at desc (newest first)
        enriched.sort(
            (a, b) => new Date(b.created_at) - new Date(a.created_at)
        );

        return enriched;
    } catch (error) {
        logger.error(
            `[assemblyaiHistory] => Error fetching History ${error.message}`
        );
        throw error;
    }
};

const extractTranscriptId = (transcriptHistory) => {};

module.exports = {
    fetchAssemblyHistory,
};
