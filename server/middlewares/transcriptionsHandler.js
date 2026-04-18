// middleWares/transcriptionHandler.js

// Import required modules and utilities
const fs = require("fs");
const path = require("path");

const {
    saveTranscriptionToFile,
    deleteTranscriptionTxtFile,
    deleteAudioFileCopy,
} = require("../utils/fileProcessor");
const uploadAudioFile = require("../utils/assemblyaiUploader");

const {
    requestTranscription,
    pollTranscriptionResult,
} = require("../utils/assemblyaiTranscriber");

const {
    insertTranscriptionBackupQuery,
    insertTranscriptionQuery,
    getAllTranscriptionsQuery,
    getTranscriptionByApiTranscriptIdQuery,
    getTranscriptionByIdQuery,
    getFilteredTranscriptionsQuery,
    deleteTranscriptionByIdQuery,
    getBackupsByTranscriptIdsQuery,
    getBackupWithRawByTranscriptIdQuery,
} = require("../db/transcribeQueries");

const logger = require("../utils/logger");
const { fetchAssemblyHistory } = require("../utils/assemblyaiHistory");
const { exportTranscriptionToFile } = require("../utils/exportService");

const {
    resolveAssemblyClientForRequest,
    resolveAssemblyClientForStoredTranscript,
} = require("../utils/assemblyaiConnectionResolver");

// imports for SSE + job ids
const { EventEmitter } = require("events");
const { randomUUID } = require("crypto");

// --- SSE + Job Management for transcribing Audio (Upload Step Progress) ---

const TRANSCRIPTION_STEPS = {
    INIT: "init",
    UPLOAD: "upload",
    TRANSCRIBE: "transcribe",
    SAVE_DB: "save_db",
    SAVE_FILE: "save_file",
    COMPLETE: "complete",
};

const createInitialStepsState = () => ({
    [TRANSCRIPTION_STEPS.INIT]: { status: "pending", error: null },
    [TRANSCRIPTION_STEPS.UPLOAD]: { status: "pending", error: null },
    [TRANSCRIPTION_STEPS.TRANSCRIBE]: { status: "pending", error: null },
    [TRANSCRIPTION_STEPS.SAVE_DB]: { status: "pending", error: null },
    [TRANSCRIPTION_STEPS.SAVE_FILE]: { status: "pending", error: null },
    [TRANSCRIPTION_STEPS.COMPLETE]: { status: "pending", error: null },
});

/**
 * status: "pending" | "in_progress" | "success" | "error"
 */
const setStepStatus = (steps, stepKey, status, errorMessage = null) => {
    if (!steps[stepKey]) return;
    steps[stepKey] = {
        status,
        error: errorMessage,
    };
};

/**
 - In-memory job registry (per-process)
 - jobs[jobId] = { steps, emitter, result, error, createdAt }
 */
const transcriptionJobs = {};

/**
 - SSE-enabled entry point:
   - expects multipart form with file (field: "audio") + options + fileModifiedDate
   - creates a jobId and starts runTranscriptionJob in the background
   - returns { jobId } immediately
 */
const startTranscriptionJob = async (request, response, next) => {
    try {
        const user = request.session.user;
        if (!user || !user.id) {
            return response.status(401).json({
                success: false,
                message: "User not authenticated",
            });
        }

        const file = request.file;
        if (!file || !file.path || !file.filename) {
            return response.status(400).json({
                success: false,
                message: "No audio file provided",
            });
        }

        /*
Parse upload options and keep connection routing metadata
outside the transcription options object.
*/
        const userOptions = sanitizeIncomingTranscriptionOptions(
            typeof request.body.options === "string"
                ? JSON.parse(request.body.options)
                : request.body.options,
        );

        const rawDate = request.body.fileModifiedDate || null;
        const rawConnectionId = String(
            request.body.assemblyai_connection_id ?? "",
        ).trim();

        /*
- Parse connection-routing inputs outside the transcription options payload.
- This keeps persisted transcript options separate from resolver-only transport metadata.
*/
        const selectedAssemblyConnectionId =
            rawConnectionId.length > 0 ? Number(rawConnectionId) : null;
        const useAppFallback =
            String(request.body.use_app_fallback || "")
                .trim()
                .toLowerCase() === "true";

        if (
            selectedAssemblyConnectionId !== null &&
            !Number.isInteger(selectedAssemblyConnectionId)
        ) {
            return response.status(400).json({
                success: false,
                message: "Invalid AssemblyAI connection selection.",
            });
        }

        if (useAppFallback && selectedAssemblyConnectionId !== null) {
            return response.status(400).json({
                success: false,
                message: "Conflicting AssemblyAI connection selection.",
            });
        }

        const jobId = randomUUID();
        const emitter = new EventEmitter();
        const steps = createInitialStepsState();

        transcriptionJobs[jobId] = {
            id: jobId,
            emitter,
            steps,
            result: null,
            error: null,
            createdAt: Date.now(),
        };

        logger.info(
            `[startTranscriptionJob] => Created job ${jobId} for user ${user.id}`,
        );

        // fire & forget: run worker in background
        runTranscriptionJob({
            jobId,
            user,
            filePath: file.path,
            filename: file.filename,
            rawDate,
            userOptions,
            selectedAssemblyConnectionId,
            useAppFallback,
        }).catch((err) => {
            logger.error(
                `[startTranscriptionJob] => Unhandled error in job ${jobId}: ${err.message}`,
            );
        });

        // 202 Accepted: processing is happening asynchronously
        return response.status(202).json({
            success: true,
            jobId,
        });
    } catch (error) {
        logger.error(
            `[startTranscriptionJob] => Error starting job: ${error.message}`,
        );
        next(error);
    }
};

/**
 * SSE endpoint to stream progress for a given jobId.
 * Client uses EventSource(`/transcription/progress/${jobId}`)
 */
const streamTranscriptionProgress = (request, response, next) => {
    try {
        const { jobId } = request.params;
        const job = transcriptionJobs[jobId];

        if (!job) {
            return response
                .status(404)
                .json({ success: false, message: "Job not found" });
        }

        const { emitter, steps } = job;

        // SSE headers
        response.setHeader("Content-Type", "text/event-stream");
        response.setHeader("Cache-Control", "no-cache");
        response.setHeader("Connection", "keep-alive");
        if (response.flushHeaders) {
            response.flushHeaders();
        }

        const sendStep = (payload) => {
            response.write(`event: step\n`);
            response.write(`data: ${JSON.stringify(payload)}\n\n`);
        };

        const sendCompleted = (payload) => {
            response.write(`event: completed\n`);
            response.write(`data: ${JSON.stringify(payload)}\n\n`);
        };

        const sendErrorEvent = (payload) => {
            response.write(`event: error\n`);
            response.write(`data: ${JSON.stringify(payload)}\n\n`);
        };

        // send current state immediately (so UI can render initial steps)
        sendStep({
            jobId,
            step: null,
            status: null,
            error: null,
            steps,
        });

        // subscribe to emitter
        emitter.on("step", sendStep);
        emitter.on("completed", sendCompleted);
        emitter.on("error", sendErrorEvent);

        // cleanup on client disconnect
        request.on("close", () => {
            emitter.removeListener("step", sendStep);
            emitter.removeListener("completed", sendCompleted);
            emitter.removeListener("error", sendErrorEvent);
            response.end();
        });
    } catch (error) {
        logger.error(
            `[streamTranscriptionProgress] => Error streaming SSE: ${error.message}`,
        );
        next(error);
    }
};

/**
 * Fetch all transcriptions from the database.
 * Logs incoming request and result.
 */

const fetchAllTranscriptions = async (request, response, next) => {
    try {
        logger.info(
            `Incoming request to ${request.method} ${request.originalUrl}`,
        );

        const transcriptions = await getAllTranscriptionsQuery();
        if (!transcriptions) {
            response
                .status(404)
                .json({ success: false, message: "No transcriptions found" });
            return;
        }

        logger.info(
            `[transcriptionsMiddleware - fetchAllTranscriptions] => Transcriptions retrieved`,
        );
        response.status(200).json({
            success: true,
            message: "Transcriptions found",
            data: transcriptions,
        });
    } catch (error) {
        logger.error(
            `[transcriptionsMiddleware - getAllTranscriptions] => Error fetching transcriptions: ${error.message}`,
        );
        next(error);
    }
};

/**
 * Fetch filtered transcriptions based on query parameters and user session.
 * Logs incoming request, filters, and result.
 */
const fetchFilteredTranscriptions = async (request, response, next) => {
    try {
        logger.info(
            `Incoming request to ${request.method} ${request.originalUrl}`,
        );

        const user = request.session.user;
        const userId = user.id;
        const isAdmin = String(user.role || "").toLowerCase() === "admin";

        // Extract filters from query parameters
        const {
            file_name,
            transcript_id,
            date_from,
            date_to,
            order_by,
            direction,
        } = request.query;

        const filters = {
            user_id: userId,
            file_name,
            transcript_id,
            date_from,
            date_to,
            order_by,
            direction,
        };

        const transcriptions = await getFilteredTranscriptionsQuery(filters);

        if (!transcriptions) {
            response
                .status(404)
                .json({ success: false, message: "No transcriptions found" });
            return;
        }

        const transcriptIds = transcriptions
            .map((t) => t.transcript_id)
            .filter(Boolean);

        const backups = await getBackupsByTranscriptIdsQuery({
            transcriptIds,
            user_id: userId,
            isAdmin,
        });

        const backupMap = new Map(
            backups.map((b) => [b.transcript_id, b.raw_api_data]),
        );

        const hydrated = transcriptions.map((t) => {
            const raw = backupMap.get(t.transcript_id);

            return {
                ...t,
                utterances: extractUtterances(raw),
                words: extractWords(raw),
            };
        });

        response.status(200).json({
            success: true,
            message: "Transcriptions found",
            data: hydrated,
        });
    } catch (error) {
        logger.error(
            `[transcriptionsMiddleware - fetchFilteredTranscriptions] => Error: ${error.message}`,
        );
        next(error);
    }
};

/**
 * Fetch a transcription by its database ID.
 * Logs request, result, and errors.
 */

const fetchTranscriptionById = async (request, response, next) => {
    try {
        logger.info(
            `Incoming request to ${request.method} ${request.originalUrl}`,
        );

        const user = request.session.user;
        const isAdmin = String(user.role || "").toLowerCase() === "admin";
        const { id } = request.params;

        // Fetch the transcription by ID
        const transcription = await getTranscriptionByIdQuery(id);

        if (!transcription) {
            response.status(401).json({
                success: false,
                message: `Transcription with ID: ${id} does not exist`,
            });
            return false;
        }

        // Enforce ownership unless admin
        if (!isAdmin && transcription.user_id !== user.id) {
            return response.status(403).json({
                success: false,
                message: "You are not authorized to access this resource!",
            });
        }

        const backups = await getBackupsByTranscriptIdsQuery({
            transcriptIds: [transcription.transcript_id],
            user_id: user.id,
            isAdmin,
        });

        const rawApiData = backups?.[0]?.raw_api_data ?? null;

        logger.info(
            `[transcriptionsMiddleware - fetchTranscriptionById] => Transcription fetched with ID: ${id}`,
        );

        response.status(200).json({
            success: true,
            message: "Transcription retrieved successfully",
            data: {
                ...transcription,
                utterances: extractUtterances(rawApiData),
                words: extractWords(rawApiData),
            },
        });
    } catch (error) {
        logger.error(
            `[transcriptionsMiddleware - fetchTranscriptionById] => Error fetching transcription with ID: ${error.message}`,
        );
        next(error);
    }
};

/**
 * Fetch a transcription by its AssemblyAI API transcript ID.
 * Logs request, result, and errors.
 */
const fetchTranscriptionByApiId = async (request, response, next) => {
    try {
        const user = request.session.user;
        const isAdmin = String(user.role || "").toLowerCase() === "admin";
        const { transcriptId } = request.params;

        logger.info(
            `Incoming request to ${request.method} ${
                request.originalUrl
            }, params: ${JSON.stringify(request.params)}`,
        );

        // Fetch the transcription by API transcript ID
        const transcription =
            await getTranscriptionByApiTranscriptIdQuery(transcriptId);

        if (!transcription) {
            logger.warn(
                `[transcriptionsMiddleware - fetchTranscriptionByApiId] => Transcription with API ID: ${transcriptId} not found`,
            );
            response.status(401).json({
                success: false,
                message: `Transcription with API ID: ${transcriptId} does not exist`,
            });
            return false;
        }

        if (!isAdmin && transcription.user_id !== user.id) {
            return response.status(403).json({
                success: false,
                message: "You are not authorized to access this resource!",
            });
        }

        const backups = await getBackupsByTranscriptIdsQuery({
            transcriptIds: [transcription.transcript_id],
            user_id: user.id,
            isAdmin,
        });

        const rawApiData = backups?.[0]?.raw_api_data ?? null;

        logger.info(
            `[transcriptionsMiddleware - fetchTranscriptionByApiId] => Transcription fetched with API ID: ${transcriptId}`,
        );
        response.status(200).json({
            success: true,
            message: "Transcription fetched successfully",
            data: {
                ...transcription,
                utterances: extractUtterances(rawApiData),
                words: extractWords(rawApiData),
            },
        });
    } catch (error) {
        logger.error(
            `[transcriptionsMiddleware - fetchTranscriptionByApiId] => Error fetching transcription: ${error.message}`,
        );
        next(error);
    }
};

/**
 * Fetch a transcription directly from the AssemblyAI API by transcript_id.
 * Logs request, result, and errors.
 */
const fetchApiTranscriptionById = async (request, response, next) => {
    try {
        const { transcript_id } = request.body;
        const user = request.session.user;

        logger.info(
            `Incoming request to ${request.method} ${
                request.originalUrl
            } body: ${JSON.stringify(
                request.body,
            )}, transcript_id: ${transcript_id}`,
        );

        if (!user?.id) {
            return response.status(401).json({
                success: false,
                message: "User not authenticated",
            });
        }

        const transcription =
            await getTranscriptionByApiTranscriptIdQuery(transcript_id);
        const backup = await getBackupWithRawByTranscriptIdQuery(transcript_id);

        const resolvedAssembly = await resolveAssemblyClientForStoredTranscript(
            {
                user_id: user.id,
                transcription,
                backup,
            },
        );

        const transcript = await resolvedAssembly.client.transcripts.get(
            `${transcript_id}`,
        );

        if (!transcript) {
            return response.status(404).json({
                success: false,
                message: "Transcript not found in AssemblyAI",
            });
        }

        logger.info(
            `[transcriptionsMiddleware - fetchApiTranscriptionById] => Transcription fetched by ID: ${transcript_id}`,
        );
        response.status(200).json({
            success: true,
            message: "Transcription fetched successfully",
            data: transcript,
        });
    } catch (error) {
        logger.error(
            `[transcriptionsMiddleware - fetchApiTranscriptionById] => Error fetching transcription : ${error.message}`,
        );
        next(error);
    }
};
/**
 * Export a transcription in the requested format (txt, etc.).
 * Checks user authorization and logs all steps.
 */
const exportTranscription = async (request, response, next) => {
    try {
        const { id } = request.params;
        const format = (request.query.format || "txt").toLowerCase();
        const user = request.session.user;

        logger.info(
            `Incoming request to ${request.method} ${request.originalUrl}`,
        ); // Log the request URL

        // Fetch transcription
        const transcription = await getTranscriptionByIdQuery(id);
        if (!transcription) {
            logger.error(
                `[transcriptionsMiddleware - fetchApiTranscriptionById] => Error fetching transcription by ID: ${error.message}`,
            );
            return response.status(404).json({
                success: false,
                message: `transcription with ID ${id} Not found`,
            });
        }
        // Check user authorization
        if (transcription.user_id !== user.id && user.role !== "admin") {
            return response.status(403).json({
                success: false,
                message: "You are not authorized to access this resource!",
            });
        }

        // Export transcription to file
        const { buffer, mime, fileName } = await exportTranscriptionToFile(
            transcription,
            format,
        );

        logger.info(
            `[transcriptionsMiddleware - exportTranscription] => file name: ${fileName} `,
        );

        response.setHeader("Content-Type", mime);
        response.setHeader(
            "Content-Disposition",
            `attachment; filename="${fileName}"`,
        );
        response.send(buffer);
        logger.info(
            `[transcriptionsMiddleware - exportTranscription] User ${request.session.user.id} exported ${transcription.transcript_id} as ${format}`,
        );
    } catch (error) {
        logger.error(
            `[transcriptionsMiddleware - exportTranscription] => Error exporting transcription : ${error.message}`,
        );
        next(error);
    }
};

const deleteDBTranscription = async (request, response, next) => {
    try {
        const { id } = request.params;
        const user = request.session.user;

        logger.info(
            `Incoming request to ${request.method} ${request.originalUrl}`,
        ); // Log the request URL

        const {
            deleteFromAssembly = false,
            deleteTxtFile = false,
            deleteAudioFile = false,
        } = request.body || {};

        const transcription = await getTranscriptionByIdQuery(id);
        if (!transcription) {
            logger.error(
                `[transcriptionsMiddleware - fetchApiTranscriptionById] => transcription with ID ${id} Not found`,
            );
            return response.status(404).json({
                success: false,
                message: `transcription with ID ${id} Not found`,
            });
        }
        if (transcription.user_id !== user.id && user.role !== "admin") {
            return response.status(403).json({
                success: false,
                message: "You are not Not Authorized to access this resource!",
            });
        }

        const results = {
            dbDeleted: false,
            assemblyDeleted: false,
            txtDeleted: false,
            audioDeleted: false,
        };

        // 1) delete from DB (always, this is the primary action)

        const transcriptionDeleted = await deleteTranscriptionByIdQuery(id);
        if (!transcriptionDeleted) {
            logger.error(
                `[transcriptionsMiddleware - deleteDBTranscription] => Error delete transcription by ID: ${error.message}`,
            );
            next(error);
        }

        results.dbDeleted = true;

        logger.info(
            `[deleteTranscription] User ${user.id} deleted transcription ${id} from database`,
        );

        // remove associated local files here

        // 2) optionally delete txt file

        if (deleteTxtFile) {
            deleteTranscriptionTxtFile(transcription.file_name);
            results.txtDeleted = true; // best-effort, errors just logged
        }

        // 3) optionally delete audio file copy

        if (deleteAudioFile) {
            deleteAudioFileCopy(transcription.file_name);
            results.audioDeleted = true;
        }

        // 4) optionally delete from AssemblyAI

        if (deleteFromAssembly && transcription.transcript_id) {
            try {
                const backup = await getBackupWithRawByTranscriptIdQuery(
                    transcription.transcript_id,
                );

                const resolvedAssembly =
                    await resolveAssemblyClientForStoredTranscript({
                        user_id: user.id,
                        transcription,
                        backup,
                    });

                const { status } =
                    await resolvedAssembly.client.transcripts.delete(
                        transcription.transcript_id,
                    );

                if (status === "completed") {
                    results.assemblyDeleted = true;
                    logger.info(
                        `[deleteTranscription] Transcript ${transcription.transcript_id} deleted from AssemblyAI`,
                    );
                } else {
                    logger.warn(
                        `[deleteTranscription] AssemblyAI delete for ${transcription.transcript_id} returned status: ${status}`,
                    );
                }
            } catch (err) {
                logger.error(
                    `[deleteTranscription] Error deleting from AssemblyAI: ${err.message}`,
                );
            }
        }

        return response.json({
            success: true,
            message: `transcription with ID ${id} successfully deleted.`,
            results,
        });
    } catch (error) {
        next(error);
    }
};

const fetchAssemblyAIHistory = async (request, response, next) => {
    try {
        const user = request.session.user;

        logger.info(
            `Incoming request to ${request.method} ${request.originalUrl}`,
        );

        const data = await fetchAssemblyHistory({ user });

        response.status(200).json({
            success: true,
            message: "API Transcription fetched successfully",
            data,
        });
    } catch (error) {
        logger.error(
            `[transcriptionsMiddleware - fetchAssemblyAIHistory] => Error fetching transcriptions: ${error.message}`,
        );
        next(error);
    }
};

const deleteAssemblyAiTranscript = async (request, response, next) => {
    try {
        const { transcriptId } = request.params;
        const user = request.session.user;

        logger.info(
            `Incoming request to ${request.method} ${request.originalUrl}, params: ${request.params}`,
        );

        if (!user?.id) {
            return response.status(401).json({
                success: false,
                message: "User not authenticated",
            });
        }

        const transcription =
            await getTranscriptionByApiTranscriptIdQuery(transcriptId);
        const backup = await getBackupWithRawByTranscriptIdQuery(transcriptId);

        const resolvedAssembly = await resolveAssemblyClientForStoredTranscript(
            {
                user_id: user.id,
                transcription,
                backup,
            },
        );

        const { status } =
            await resolvedAssembly.client.transcripts.delete(transcriptId);

        if (status !== "completed") {
            logger.warn(
                `[transcriptionsMiddleware - deleteAssemblyAiTranscript] => Request to ${request.originalUrl} was not successful.`,
            );
            throw new Error("Failed to delete transcript from AssemblyAI.");
        }

        logger.info(
            `[transcriptionsMiddleware - deleteAssemblyAiTranscript] => Transcript with ID ${transcriptId} deleted from AssemblyAI API`,
        );
        response.json({
            success: true,
            message: `Transcript with ID ${transcriptId} deleted from AssemblyAI API`,
        });
    } catch (error) {
        logger.error(
            `[transcriptionsMiddleware - deleteAssemblyAiTranscript] => Error delete transcript: ${error.message}`,
        );
        next(error);
    }
};

const restoreTranscription = async (request, response, next) => {
    try {
        const user = request.session.user;
        const userId = user?.id;

        const {
            transcript_id,
            file_name: clientFileName,
            audio_duration: clientAudioDuration,
        } = request.body;

        logger.info(
            `Incoming request to ${request.method} ${request.originalUrl}`,
        );

        if (!userId) {
            logger.warn(
                `[transcriptionsMiddleware - restoreTranscription] => Unauthorized restore attempt`,
            );
            return response.status(401).json({
                success: false,
                message: "User not authenticated",
            });
        }

        // Required fields
        if (!transcript_id) {
            logger.warn(
                `[transcriptionsMiddleware - restoreTranscription] => Missing fields. transcript_id? "${transcript_id}" `,
            );
            return response.status(400).json({
                success: false,
                message: "Missing transcript_id",
            });
        }

        // Prevent duplicate offline row
        const existing =
            await getTranscriptionByApiTranscriptIdQuery(transcript_id);
        if (existing) {
            logger.warn(
                `[transcriptionsMiddleware - restoreTranscription] => Transcript with ID: ${transcript_id} already exists in database`,
            );
            return response.status(409).json({
                success: false,
                message: "Transcript already exists",
            });
        }

        // Fetch backup with raw_api_data
        const backup = await getBackupWithRawByTranscriptIdQuery(transcript_id);
        if (!backup) {
            logger.warn(
                `[transcriptionsMiddleware - restoreTranscription] => No backup found for transcript_id: ${transcript_id}`,
            );
            return response.status(404).json({
                success: false,
                message: "No backup found for this transcript",
            });
        }

        const raw = backup.raw_api_data;

        // Prefer backup values (source of truth), fallback to client only if needed
        const restoredFileName = backup.file_name ?? clientFileName;
        const restoredRecordedAt = backup.file_recorded_at ?? null;

        if (!restoredFileName) {
            return response.status(400).json({
                success: false,
                message:
                    "Missing file_name (not present in backup and not provided by client)",
            });
        }

        // Speaker markers restored by using existing helper
        // raw may be { transcript: {...} } or already the transcript object
        const transcriptObject = raw?.transcript ?? raw;
        const transcriptionText = flattenTranscription(transcriptObject);

        // Restore metadata/options so detail UI is populated
        const options = {
            // match what UI expects (safe defaults)
            language_code:
                raw?.language_code ?? raw?.transcript?.language_code ?? null,

            speech_model:
                raw?.speech_model ??
                raw?.transcript?.speech_model ??
                raw?.speech_models?.[0] ??
                raw?.transcript?.speech_models?.[0] ??
                null,

            speech_models:
                raw?.speech_models ??
                raw?.transcript?.speech_models ??
                (raw?.speech_model ? [raw.speech_model] : null) ??
                (raw?.transcript?.speech_model
                    ? [raw.transcript.speech_model]
                    : null),

            language_detection:
                raw?.language_detection ??
                raw?.transcript?.language_detection ??
                null,

            language_detection_options:
                raw?.language_detection_options ??
                raw?.transcript?.language_detection_options ??
                null,

            punctuate: raw?.punctuate ?? raw?.transcript?.punctuate ?? null,

            format_text:
                raw?.format_text ?? raw?.transcript?.format_text ?? null,

            speaker_labels:
                raw?.speaker_labels ?? raw?.transcript?.speaker_labels ?? null,

            speakers_expected:
                raw?.speakers_expected ??
                raw?.transcript?.speakers_expected ??
                null,

            entity_detection:
                raw?.entity_detection ??
                raw?.transcript?.entity_detection ??
                null,

            sentiment_analysis:
                raw?.sentiment_analysis ??
                raw?.transcript?.sentiment_analysis ??
                null,
        };

        // Duration: prefer client payload, fallback to raw
        const restoredAudioDuration =
            raw?.audio_duration ?? clientAudioDuration ?? null;

        if (!transcriptionText) {
            logger.warn(
                `[transcriptionsMiddleware - restoreTranscription] => Could not derive transcription text from backup.raw_api_data for transcript_id: ${transcript_id}`,
            );
        }

        // Insert restored transcription into offline table
        const inserted = await insertTranscriptionQuery({
            user_id: userId,
            file_name: restoredFileName,
            transcript_id,
            transcription: transcriptionText,
            options,
            file_recorded_at: restoredRecordedAt,
            audio_duration: restoredAudioDuration,
            assemblyai_connection_id: backup.assemblyai_connection_id ?? null,
            assemblyai_connection_label:
                backup.assemblyai_connection_label ?? null,
            assemblyai_connection_source:
                backup.assemblyai_connection_source ?? "legacy_unknown",
        });
        logger.info(
            `[transcriptionsMiddleware - restoreTranscription] => Transcript with ID ${transcript_id} restored to offline successfully for user ${userId}`,
        );

        return response.status(201).json({
            success: true,
            message: "Transcript restored to offline successfully",
            data: inserted,
        });
    } catch (error) {
        logger.error(
            `[transcriptionsMiddleware - restoreTranscription] => Error restoring transcript: ${error.message}`,
        );
        next(error);
    }
};

const streamAudioFile = (request, response, next) => {
    try {
        const uploadDir = path.join(__dirname, "../uploads");

        // prevent path traversal
        const rawName = String(request.params.fileName || "");
        const safeName = path.basename(rawName);

        const audioPath = path.join(uploadDir, safeName);

        if (!audioPath.startsWith(uploadDir)) {
            return response.status(400).json({ message: "Invalid file name" });
        }

        if (!fs.existsSync(audioPath)) {
            return response
                .status(404)
                .json({ message: "Audio file not found" });
        }

        const stat = fs.statSync(audioPath);
        const fileSize = stat.size;
        const range = request.headers.range;

        // basic content-type mapping
        const ext = path.extname(audioPath).toLowerCase();
        const contentType =
            ext === ".mp3"
                ? "audio/mpeg"
                : ext === ".wav"
                  ? "audio/wav"
                  : ext === ".m4a"
                    ? "audio/mp4"
                    : ext === ".aac"
                      ? "audio/aac"
                      : "application/octet-stream";

        if (range) {
            const parts = range.replace(/bytes=/, "").split("-");
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

            if (Number.isNaN(start) || Number.isNaN(end) || start > end) {
                return response
                    .status(416)
                    .send("Requested Range Not Satisfiable");
            }

            const chunkSize = end - start + 1;

            response.writeHead(206, {
                "Content-Range": `bytes ${start}-${end}/${fileSize}`,
                "Accept-Ranges": "bytes",
                "Content-Length": chunkSize,
                "Content-Type": contentType,
            });

            const stream = fs.createReadStream(audioPath, { start, end });
            stream.on("error", next);
            return stream.pipe(response);
        }

        response.writeHead(200, {
            "Content-Length": fileSize,
            "Content-Type": contentType,
            "Accept-Ranges": "bytes",
        });

        const stream = fs.createReadStream(audioPath);
        stream.on("error", next);
        return stream.pipe(response);
    } catch (err) {
        return next(err);
    }
};

// Helper functions

// Prefer array-based model selection, fallback to legacy field
const getSpeechModelFromTranscript = (transcript) => {
    if (!transcript) return null;
    if (
        Array.isArray(transcript.speech_models) &&
        transcript.speech_models[0]
    ) {
        return transcript.speech_models[0];
    }
    return transcript.speech_model ?? null;
};

const getSpeechModelsFromTranscript = (transcript) => {
    if (!transcript) return null;
    if (
        Array.isArray(transcript.speech_models) &&
        transcript.speech_models.length
    ) {
        return transcript.speech_models;
    }
    if (transcript.speech_model) return [transcript.speech_model];
    return null;
};

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

const normalizeLanguageCodeForStorage = ({
    transcript = {},
    userOptions = {},
}) => {
    if (userOptions.language_detection === true) {
        return "auto";
    }

    if (
        typeof transcript.language_code === "string" &&
        transcript.language_code
    ) {
        return transcript.language_code;
    }

    if (
        typeof userOptions.language_code === "string" &&
        userOptions.language_code
    ) {
        return userOptions.language_code;
    }

    return null;
};

/**
- Normalizes speaker identification data for storage
- Ensures stored structure matches actual API request
*/
const sanitizeSpeakerIdentificationForStorage = (speakerIdentification) => {
    if (!speakerIdentification?.enabled) {
        return undefined;
    }

    const knownValues = Array.isArray(speakerIdentification.known_values)
        ? speakerIdentification.known_values
              .map((value) => String(value).trim())
              .filter(Boolean)
        : undefined;

    // Storage must reflect actual API request
    // Empty arrays are omitted to avoid invalid structure
    return {
        speaker_type: speakerIdentification.speaker_type ?? "name",
        ...(knownValues && knownValues.length > 0
            ? { known_values: knownValues }
            : {}),
    };
};

/*
- Normalizes and sanitizes incoming transcription options from the client.
- Inputs: raw request options object.
- Outputs: backend-safe transcription options object.
- Important behavior: removes schema combinations that AssemblyAI rejects, including `speakers_expected` during speaker identification mode.
*/
const sanitizeIncomingTranscriptionOptions = (rawOptions = {}) => {
    const userOptions =
        rawOptions && typeof rawOptions === "object" ? { ...rawOptions } : {};

    delete userOptions.speaker_options;

    if (userOptions.speaker_identification?.enabled) {
        const knownValues = Array.isArray(
            userOptions.speaker_identification.known_values,
        )
            ? userOptions.speaker_identification.known_values
                  .map((value) => String(value).trim())
                  .filter(Boolean)
            : [];

        userOptions.speaker_labels = true;
        delete userOptions.speakers_expected;

        userOptions.speaker_identification = {
            enabled: true,
            speaker_type:
                userOptions.speaker_identification.speaker_type ?? "name",
            ...(knownValues.length > 0 ? { known_values: knownValues } : {}),
        };
    } else if (userOptions.speaker_labels) {
        const parsedSpeakersExpected = Number(userOptions.speakers_expected);

        if (
            Number.isFinite(parsedSpeakersExpected) &&
            parsedSpeakersExpected >= 1
        ) {
            userOptions.speakers_expected = Math.max(
                1,
                Math.trunc(parsedSpeakersExpected),
            );
        } else {
            delete userOptions.speakers_expected;
        }
    } else {
        delete userOptions.speakers_expected;
    }

    return userOptions;
};

/**
- Builds normalized transcription options for database storage
- Aligns stored values with final AssemblyAI request and response
*/
const buildStoredTranscriptionOptions = ({
    transcript = {},
    userOptions = {},
}) => {
    const speech_models = getSpeechModelsFromTranscript(transcript) ?? [];

    const normalizedSpeakerIdentification =
        sanitizeSpeakerIdentificationForStorage(
            userOptions.speaker_identification,
        );

    // speaker_labels is required for identification and must be persisted
    // transcript value takes priority when available
    const diarizationEnabled =
        transcript.speaker_labels ?? userOptions.speaker_labels ?? false;

    const identificationEnabled = Boolean(normalizedSpeakerIdentification);

    const normalizedOptions = {
        language_code: normalizeLanguageCodeForStorage({
            transcript,
            userOptions,
        }),
        speech_models,

        language_detection:
            userOptions.language_detection === true ? true : undefined,
        language_detection_options:
            userOptions.language_detection_options ?? undefined,

        prompt:
            typeof userOptions.prompt === "string" && userOptions.prompt.trim()
                ? userOptions.prompt.trim()
                : undefined,

        speaker_labels: diarizationEnabled,

        speakers_expected:
            diarizationEnabled && !identificationEnabled
                ? (transcript.speakers_expected ??
                  userOptions.speakers_expected ??
                  1)
                : undefined,

        speaker_identification: normalizedSpeakerIdentification,

        format_text: transcript.format_text ?? userOptions.format_text ?? true,
        punctuate: transcript.punctuate ?? userOptions.punctuate ?? true,
        disfluencies:
            transcript.disfluencies ?? userOptions.disfluencies ?? false,
    };

    return Object.fromEntries(
        Object.entries(normalizedOptions).filter(
            ([, value]) => value !== undefined,
        ),
    );
};

const extractUtterances = (rawApiData) => {
    const raw = safeParseRaw(rawApiData);
    const transcriptObject = raw?.transcript ?? raw;
    const utterances = transcriptObject?.utterances;

    if (!Array.isArray(utterances) || utterances.length === 0) return null;

    // Return only fields the UI needs
    return utterances.map((u) => ({
        speaker: u?.speaker ?? null,
        text: u?.text ?? "",
        start: u?.start ?? null,
        end: u?.end ?? null,
    }));
};

/*
- purpose: extract word-level timing data from AssemblyAI raw response
- inputs: raw_api_data from transcription_backups
- outputs: normalized word array for frontend playback sync
- important behavior: returns only fields needed for highlighting
*/

const extractWords = (rawApiData) => {
    const raw = safeParseRaw(rawApiData);
    const transcriptObject = raw?.transcript ?? raw;
    const words = transcriptObject?.words;

    if (!Array.isArray(words) || words.length === 0) return null;

    return words.map((w) => ({
        text: w?.text ?? "",
        start: w?.start ?? null,
        end: w?.end ?? null,
        confidence: typeof w?.confidence === "number" ? w.confidence : null,
        speaker: w?.speaker ?? null,
    }));
};

/**
 - Internal worker that runs the full transcription pipeline for one jobId.
 - Emits step events via job.emitter for SSE clients.
 */
const runTranscriptionJob = async ({
    jobId,
    user,
    filePath,
    filename,
    rawDate,
    userOptions,
    selectedAssemblyConnectionId = null,
    useAppFallback = false,
}) => {
    const job = transcriptionJobs[jobId];
    if (!job) {
        logger.warn(
            `[runTranscriptionJob] => Job ${jobId} no longer exists in registry`,
        );
        return;
    }

    const { emitter, steps } = job;

    const emitStep = (stepKey, status, errorMessage = null) => {
        setStepStatus(steps, stepKey, status, errorMessage);
        emitter.emit("step", {
            jobId,
            step: stepKey,
            status,
            error: errorMessage,
            steps,
        });
    };

    try {
        const loggedUserId = user.id;
        const userRole = user.role;

        //  INIT
        emitStep(TRANSCRIPTION_STEPS.INIT, "in_progress");

        if (!loggedUserId) {
            const msg = "User not authenticated";
            emitStep(TRANSCRIPTION_STEPS.INIT, "error", msg);
            setStepStatus(steps, TRANSCRIPTION_STEPS.COMPLETE, "error", msg);
            emitter.emit("error", {
                jobId,
                steps,
                error: msg,
                message: msg,
            });
            return;
        }

        if (!filePath || !filename) {
            const msg = "No audio file provided";
            emitStep(TRANSCRIPTION_STEPS.INIT, "error", msg);
            setStepStatus(steps, TRANSCRIPTION_STEPS.COMPLETE, "error", msg);
            emitter.emit("error", {
                jobId,
                steps,
                error: msg,
                message: msg,
            });
            return;
        }

        const fileModifiedDate = rawDate ? new Date(rawDate) : "00.00.00";
        const fileModifiedDisplayDate =
            fileModifiedDate instanceof Date &&
            !Number.isNaN(fileModifiedDate.getTime())
                ? fileModifiedDate.toLocaleString("en-GB").replace(/\//g, ".")
                : "00.00.00";

        logger.info(
            `Incoming SSE transcription job ${jobId} from user_id ${loggedUserId}`,
        );

        console.log(
            `[runTranscriptionJob] => jobId=${jobId}, filename=${filename}, fileModifiedDate=${fileModifiedDisplayDate}`,
        );
        console.log(
            `[runTranscriptionJob] Received options: ${JSON.stringify(
                userOptions,
            )}`,
        );

        emitStep(TRANSCRIPTION_STEPS.INIT, "success");

        const resolvedAssembly = await resolveAssemblyClientForRequest({
            user_id: loggedUserId,
            selectedConnectionId: selectedAssemblyConnectionId,
            useAppFallback,
        });

        //  UPLOAD
        emitStep(TRANSCRIPTION_STEPS.UPLOAD, "in_progress");

        const uploadUrl = await uploadAudioFile(
            filePath,
            resolvedAssembly.apiKey,
        );

        emitStep(TRANSCRIPTION_STEPS.UPLOAD, "success");

        //  TRANSCRIBE
        emitStep(TRANSCRIPTION_STEPS.TRANSCRIBE, "in_progress");

        const transcriptionOptions = {
            audio_url: uploadUrl,
            ...userOptions,
        };

        console.log(
            `[runTranscriptionJob] transcriptionOptions: ${JSON.stringify(
                transcriptionOptions,
            )}`,
        );

        const transcriptResponse = await requestTranscription(
            transcriptionOptions,
            resolvedAssembly.client,
        );
        const transcriptId = transcriptResponse?.id;

        if (!transcriptId) {
            throw new Error("AssemblyAI did not return a transcript id.");
        }

        const transcript = await pollTranscriptionResult(
            transcriptId,
            resolvedAssembly.client,
        );

        emitStep(TRANSCRIPTION_STEPS.TRANSCRIBE, "success");

        //  SAVE_DB
        emitStep(TRANSCRIPTION_STEPS.SAVE_DB, "in_progress");

        const createBackup = await insertTranscriptionBackupQuery({
            transcript_id: transcriptId,
            user_id: loggedUserId,
            user_role: userRole,
            raw_api_data: transcript,
            file_name: filename,
            file_recorded_at: fileModifiedDate,
            assemblyai_connection_id: resolvedAssembly.assemblyai_connection_id,
            assemblyai_connection_label:
                resolvedAssembly.assemblyai_connection_label,
            assemblyai_connection_source:
                resolvedAssembly.assemblyai_connection_source,
        });

        if (!createBackup) {
            throw new Error(
                "Failed to insert transcription backup into database",
            );
        }

        logger.info(
            `[runTranscriptionJob] => insertTranscriptionBackupQuery: Transcript's API response for User ${loggedUserId} stored`,
        );

        const { audio_duration } = transcript;

        const resTranscriptOptions = buildStoredTranscriptionOptions({
            transcript,
            userOptions,
        });

        const transcriptData = {
            user_id: loggedUserId,
            file_name: filename,
            audio_duration,
            transcript_id: transcriptId,
            options: resTranscriptOptions,
            file_recorded_at: fileModifiedDate,
            transcriptObject: transcript,
            assemblyai_connection_id: resolvedAssembly.assemblyai_connection_id,
            assemblyai_connection_label:
                resolvedAssembly.assemblyai_connection_label,
            assemblyai_connection_source:
                resolvedAssembly.assemblyai_connection_source,
        };

        const insertedTranscription = await storeTranscriptionText({
            transcriptData,
        });

        emitStep(TRANSCRIPTION_STEPS.SAVE_DB, "success");

        // ----------------- SAVE_FILE -----------------
        emitStep(TRANSCRIPTION_STEPS.SAVE_FILE, "in_progress");

        const storedTxtfilePath = saveTranscriptionToFile(
            filename,
            insertedTranscription.transcription,
            fileModifiedDisplayDate,
        );

        emitStep(TRANSCRIPTION_STEPS.SAVE_FILE, "success");

        //  COMPLETE
        // Emit the finalized offline transcript payload used by the client immediately
        // after upload so history/detail views do not need a refetch for timing data.
        setStepStatus(steps, TRANSCRIPTION_STEPS.COMPLETE, "success", null);
        job.result = insertedTranscription;
        job.error = null;

        emitter.emit("completed", {
            jobId,
            steps,
            message: `Transcription created and stored successfully at: ${storedTxtfilePath}`,
            transcriptData: {
                ...insertedTranscription,
                utterances: extractUtterances(transcript),
                words: extractWords(transcript),
            },
        });

        logger.info(
            `[runTranscriptionJob] => job ${jobId} completed successfully`,
        );
    } catch (err) {
        const msg = err && err.message ? err.message : String(err);
        logger.error(`[runTranscriptionJob] => Error in job ${jobId}: ${msg}`);
        job.error = msg;

        setStepStatus(steps, TRANSCRIPTION_STEPS.COMPLETE, "error", msg);

        emitter.emit("error", {
            jobId,
            steps,
            error: msg,
            message: msg,
        });
    } finally {
        setTimeout(
            () => {
                delete transcriptionJobs[jobId];
            },
            10 * 60 * 1000,
        );
    }
};

/**
 * Helper to store transcription text in the database.
 * Converts utterances to plain text and inserts into DB.
 * @param {Object} transcriptData - Data containing transcript object and metadata.
 * @returns {Object} Inserted transcription record.
 */
const storeTranscriptionText = async ({ transcriptData }) => {
    try {
        const transcript = transcriptData.transcriptObject || {};
        let transcriptionText = "";

        // 1) Preferred: utterances array (speaker-separated text)
        if (
            transcript &&
            Array.isArray(transcript.utterances) &&
            transcript.utterances.length > 0
        ) {
            transcriptionText = transcript.utterances
                .map((utterance) => {
                    const speakerLabel =
                        utterance.speaker !== undefined &&
                        utterance.speaker !== null
                            ? `Speaker ${utterance.speaker}`
                            : "Speaker";
                    return `${speakerLabel}: ${utterance.text}`;
                })
                .join("\n");
        }
        // 2) Fallback: top-level text (if utterances is null - basic texts)
        else if (
            typeof transcript.text === "string" &&
            transcript.text.trim().length > 0
        ) {
            transcriptionText = transcript.text;
        }
        // 3) Extra fallback: if field is named "transcript"
        else if (
            typeof transcript.transcript === "string" &&
            transcript.transcript.trim().length > 0
        ) {
            transcriptionText = transcript.transcript;
        }
        // 4) Last resort: stringify the object so transcript data is not lost
        else {
            transcriptionText = JSON.stringify(transcript, null, 2);
        }

        logger.info(
            `[transcriptionMiddleware - createTranscription - storeTranscriptionText] => Transcription text prepared (length=${transcriptionText.length}).`,
        );

        const transcriptionDataToInsert = {
            transcription: transcriptionText,
            ...transcriptData,
        };

        const insertedTranscription = await insertTranscriptionQuery({
            ...transcriptionDataToInsert,
        });

        logger.info(`Transcription stored in database.`);

        return insertedTranscription;
    } catch (error) {
        logger.error(
            `[transcriptionsMiddleware - storeTranscriptionText] => Error storing transcription: ${error.message}`,
        );
        throw error;
    }
};

const flattenTranscription = (transcriptObject) => {
    if (!transcriptObject) return "";

    // 1) Prefer utterances if available
    if (
        Array.isArray(transcriptObject.utterances) &&
        transcriptObject.utterances.length > 0
    ) {
        return transcriptObject.utterances
            .map(
                (u) =>
                    `Speaker ${u.speaker != null ? u.speaker : ""}: ${
                        u.text || ""
                    }`,
            )
            .join("\n");
    }

    // 2) Fallback: plain text field from AssemblyAI
    if (
        typeof transcriptObject.text === "string" &&
        transcriptObject.text.trim().length > 0
    ) {
        return transcriptObject.text;
    }

    return "";
};

// Export all middleware functions for use in routes
module.exports = {
    fetchAllTranscriptions,
    fetchTranscriptionById,
    fetchTranscriptionByApiId,
    fetchApiTranscriptionById,
    fetchFilteredTranscriptions,
    exportTranscription,
    deleteDBTranscription,
    fetchAssemblyAIHistory,
    deleteAssemblyAiTranscript,
    restoreTranscription,
    startTranscriptionJob,
    streamTranscriptionProgress,
    streamAudioFile,
};
