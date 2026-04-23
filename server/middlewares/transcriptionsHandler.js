// middleWares/transcriptionHandler.js

// Import required modules and utilities
const fs = require("fs");
const path = require("path");

const { deleteAudioFileCopy } = require("../utils/fileProcessor");
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
    COMPLETE: "complete",
};

const createInitialStepsState = () => ({
    [TRANSCRIPTION_STEPS.INIT]: { status: "pending", error: null },
    [TRANSCRIPTION_STEPS.UPLOAD]: { status: "pending", error: null },
    [TRANSCRIPTION_STEPS.TRANSCRIBE]: { status: "pending", error: null },
    [TRANSCRIPTION_STEPS.SAVE_DB]: { status: "pending", error: null },
    [TRANSCRIPTION_STEPS.COMPLETE]: { status: "pending", error: null },
});

/*
  status: "pending" | "in_progress" | "success" | "error"
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

/*
 - SSE-enabled entry point:
   - expects multipart form with file (field: "audio") + options + fileModifiedDate
   - creates a jobId and starts runTranscriptionJob in the background
   - returns { jobId } immediately
 */
const startTranscriptionJob = async (request, response, next) => {
    try {
        const user = request.session.user;
        if (!user || !user.id) {
            logger.warn(
                `[transcriptionsHandler.startTranscriptionJob] => start transcription job: denied | ${JSON.stringify(
                    {
                        reason: "missing_session_user",
                    },
                )}`,
            );
            return response.status(401).json({
                success: false,
                message: "User not authenticated",
            });
        }

        const file = request.file;
        if (!file || !file.path || !file.filename) {
            logger.warn(
                `[transcriptionsHandler.startTranscriptionJob] => validate audio file: denied | ${JSON.stringify(
                    {
                        userId: user.id,
                        reason: "missing_audio_file",
                    },
                )}`,
            );
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
        const rawCategory = String(request.body.category ?? "").trim();

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
        const category = rawCategory.length > 0 ? rawCategory : null;

        if (
            selectedAssemblyConnectionId !== null &&
            !Number.isInteger(selectedAssemblyConnectionId)
        ) {
            logger.warn(
                `[transcriptionsHandler.startTranscriptionJob] => validate assembly connection selection: denied | ${JSON.stringify(
                    {
                        userId: user.id,
                        reason: "invalid_connection_selection",
                    },
                )}`,
            );
            return response.status(400).json({
                success: false,
                message: "Invalid AssemblyAI connection selection.",
            });
        }

        if (useAppFallback && selectedAssemblyConnectionId !== null) {
            logger.warn(
                `[transcriptionsHandler.startTranscriptionJob] => validate assembly connection selection: denied | ${JSON.stringify(
                    {
                        userId: user.id,
                        reason: "conflicting_connection_selection",
                    },
                )}`,
            );
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
            `[transcriptionsHandler.startTranscriptionJob] => start transcription job: success | ${JSON.stringify(
                {
                    userId: user.id,
                    jobId,
                },
            )}`,
        );

        // fire & forget: run worker in background
        runTranscriptionJob({
            jobId,
            user,
            filePath: file.path,
            filename: file.filename,
            rawDate,
            userOptions,
            category,
            selectedAssemblyConnectionId,
            useAppFallback,
        }).catch((err) => {
            logger.error(
                `[transcriptionsHandler.startTranscriptionJob] => run transcription job: failed | ${JSON.stringify(
                    {
                        userId: user.id,
                        jobId,
                        error: err.message,
                    },
                )}`,
            );
        });

        // 202 Accepted: processing is happening asynchronously
        return response.status(202).json({
            success: true,
            jobId,
        });
    } catch (error) {
        logger.error(
            `[transcriptionsHandler.startTranscriptionJob] => start transcription job: failed | ${JSON.stringify(
                {
                    error: error.message,
                },
            )}`,
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
            logger.warn(
                `[transcriptionsHandler.streamTranscriptionProgress] => stream transcription progress: denied | ${JSON.stringify(
                    {
                        jobId,
                        reason: "job_not_found",
                    },
                )}`,
            );
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

        logger.info(
            `[transcriptionsHandler.streamTranscriptionProgress] => stream transcription progress: success | ${JSON.stringify(
                {
                    jobId,
                },
            )}`,
        );

        // cleanup on client disconnect
        request.on("close", () => {
            emitter.removeListener("step", sendStep);
            emitter.removeListener("completed", sendCompleted);
            emitter.removeListener("error", sendErrorEvent);
            response.end();
        });
    } catch (error) {
        logger.error(
            `[transcriptionsHandler.streamTranscriptionProgress] => stream transcription progress: failed | ${JSON.stringify(
                {
                    error: error.message,
                },
            )}`,
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
        const transcriptions = await getAllTranscriptionsQuery();
        if (!transcriptions) {
            logger.warn(
                `[transcriptionsHandler.fetchAllTranscriptions] => fetch all transcriptions: denied | ${JSON.stringify(
                    {
                        reason: "transcriptions_not_found",
                    },
                )}`,
            );
            response
                .status(404)
                .json({ success: false, message: "No transcriptions found" });
            return;
        }

        logger.info(
            `[transcriptionsHandler.fetchAllTranscriptions] => fetch all transcriptions: success | ${JSON.stringify(
                {
                    transcriptionCount: transcriptions.length,
                },
            )}`,
        );
        response.status(200).json({
            success: true,
            message: "Transcriptions found",
            data: transcriptions,
        });
    } catch (error) {
        logger.error(
            `[transcriptionsHandler.fetchAllTranscriptions] => fetch all transcriptions: failed | ${JSON.stringify(
                {
                    error: error.message,
                },
            )}`,
        );
        next(error);
    }
};

/*
- purpose: fetch filtered transcription history rows for the current user
- inputs: request query filters and session user
- outputs: filtered transcription rows with timing metadata added from backups
- important behavior:
  - scopes history to the authenticated user unless admin rules apply downstream
  - passes supported filter fields to the DB query layer
  - hydrates returned rows with utterances and words from backup raw API data
*/
const fetchFilteredTranscriptions = async (request, response, next) => {
    try {
        const user = request.session.user;
        const userId = user.id;
        const isAdmin = String(user.role || "").toLowerCase() === "admin";

        // Extract filters from query parameters
        const {
            file_name,
            transcript_id,
            category,
            date_from,
            date_to,
            order_by,
            direction,
        } = request.query;

        const filters = {
            user_id: userId,
            file_name,
            transcript_id,
            category,
            date_from,
            date_to,
            order_by,
            direction,
        };

        const transcriptions = await getFilteredTranscriptionsQuery(filters);

        if (!transcriptions) {
            logger.warn(
                `[transcriptionsHandler.fetchFilteredTranscriptions] => fetch filtered transcriptions: denied | ${JSON.stringify(
                    {
                        userId,
                        reason: "transcriptions_not_found",
                    },
                )}`,
            );
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
        logger.info(
            `[transcriptionsHandler.fetchFilteredTranscriptions] => fetch filtered transcriptions: success | ${JSON.stringify(
                {
                    userId,
                    transcriptionCount: hydrated.length,
                },
            )}`,
        );
    } catch (error) {
        logger.error(
            `[transcriptionsHandler.fetchFilteredTranscriptions] => fetch filtered transcriptions: failed | ${JSON.stringify(
                {
                    error: error.message,
                },
            )}`,
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
        const user = request.session.user;
        const isAdmin = String(user.role || "").toLowerCase() === "admin";
        const { id } = request.params;

        // Fetch the transcription by ID
        const transcription = await getTranscriptionByIdQuery(id);

        if (!transcription) {
            logger.warn(
                `[transcriptionsHandler.fetchTranscriptionById] => fetch transcription by id: denied | ${JSON.stringify(
                    {
                        userId: user?.id,
                        resourceId: id,
                        reason: "transcription_not_found",
                    },
                )}`,
            );
            response.status(401).json({
                success: false,
                message: `Transcription with ID: ${id} does not exist`,
            });
            return false;
        }

        // Enforce ownership unless admin
        if (!isAdmin && transcription.user_id !== user.id) {
            logger.warn(
                `[transcriptionsHandler.fetchTranscriptionById] => fetch transcription by id: denied | ${JSON.stringify(
                    {
                        userId: user.id,
                        resourceId: id,
                        reason: "forbidden",
                    },
                )}`,
            );
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
            `[transcriptionsHandler.fetchTranscriptionById] => fetch transcription by id: success | ${JSON.stringify(
                {
                    userId: user.id,
                    resourceId: id,
                },
            )}`,
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
            `[transcriptionsHandler.fetchTranscriptionById] => fetch transcription by id: failed | ${JSON.stringify(
                {
                    error: error.message,
                },
            )}`,
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

        // Fetch the transcription by API transcript ID
        const transcription =
            await getTranscriptionByApiTranscriptIdQuery(transcriptId);

        if (!transcription) {
            logger.warn(
                `[transcriptionsHandler.fetchTranscriptionByApiId] => fetch transcription by api id: denied | ${JSON.stringify(
                    {
                        userId: user.id,
                        resourceId: transcriptId,
                        reason: "transcription_not_found",
                    },
                )}`,
            );
            response.status(401).json({
                success: false,
                message: `Transcription with API ID: ${transcriptId} does not exist`,
            });
            return false;
        }

        if (!isAdmin && transcription.user_id !== user.id) {
            logger.warn(
                `[transcriptionsHandler.fetchTranscriptionByApiId] => fetch transcription by api id: denied | ${JSON.stringify(
                    {
                        userId: user.id,
                        resourceId: transcriptId,
                        reason: "forbidden",
                    },
                )}`,
            );
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
            `[transcriptionsHandler.fetchTranscriptionByApiId] => fetch transcription by api id: success | ${JSON.stringify(
                {
                    userId: user.id,
                    resourceId: transcriptId,
                },
            )}`,
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
            `[transcriptionsHandler.fetchTranscriptionByApiId] => fetch transcription by api id: failed | ${JSON.stringify(
                {
                    error: error.message,
                },
            )}`,
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

        if (!user?.id) {
            logger.warn(
                `[transcriptionsHandler.fetchApiTranscriptionById] => fetch api transcription by id: denied | ${JSON.stringify(
                    {
                        resourceId: transcript_id,
                        reason: "missing_session_user",
                    },
                )}`,
            );
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
            logger.warn(
                `[transcriptionsHandler.fetchApiTranscriptionById] => fetch api transcription by id: denied | ${JSON.stringify(
                    {
                        userId: user.id,
                        resourceId: transcript_id,
                        reason: "transcript_not_found",
                    },
                )}`,
            );
            return response.status(404).json({
                success: false,
                message: "Transcript not found in AssemblyAI",
            });
        }

        logger.info(
            `[transcriptionsHandler.fetchApiTranscriptionById] => fetch api transcription by id: success | ${JSON.stringify(
                {
                    userId: user.id,
                    resourceId: transcript_id,
                },
            )}`,
        );
        response.status(200).json({
            success: true,
            message: "Transcription fetched successfully",
            data: transcript,
        });
    } catch (error) {
        logger.error(
            `[transcriptionsHandler.fetchApiTranscriptionById] => fetch api transcription by id: failed | ${JSON.stringify(
                {
                    error: error.message,
                },
            )}`,
        );
        next(error);
    }
};

/*
- purpose: export one stored transcription in the requested download format
- inputs: request params id, request query format, authenticated session user
- outputs: downloadable file response with content headers and file buffer
- important behavior:
  - reads the transcription record from the database first
  - authorizes access before generating the export
  - generates txt, pdf, or docx content on demand
*/
const exportTranscription = async (request, response, next) => {
    try {
        const { id } = request.params;
        const format = (request.query.format || "txt").toLowerCase();
        const user = request.session.user;

        const transcription = await getTranscriptionByIdQuery(id);
        if (!transcription) {
            logger.warn(
                `[transcriptionsHandler.exportTranscription] => export transcription: denied | ${JSON.stringify(
                    {
                        userId: user?.id,
                        resourceId: id,
                        reason: "transcription_not_found",
                    },
                )}`,
            );
            return response.status(404).json({
                success: false,
                message: `transcription with ID ${id} Not found`,
            });
        }

        if (transcription.user_id !== user.id && user.role !== "admin") {
            logger.warn(
                `[transcriptionsHandler.exportTranscription] => export transcription: denied | ${JSON.stringify(
                    {
                        userId: user.id,
                        resourceId: id,
                        reason: "forbidden",
                    },
                )}`,
            );
            return response.status(403).json({
                success: false,
                message: "You are not authorized to access this resource!",
            });
        }

        // Generate the export file directly from the stored database content.
        const { buffer, mime, fileName } = await exportTranscriptionToFile(
            transcription,
            format,
        );

        response.setHeader("Content-Type", mime);
        response.setHeader(
            "Content-Disposition",
            `attachment; filename="${fileName}"`,
        );
        response.send(buffer);

        logger.info(
            `[transcriptionsHandler.exportTranscription] => export transcription: success | ${JSON.stringify(
                {
                    userId: request.session.user.id,
                    resourceId: transcription.transcript_id,
                    format,
                },
            )}`,
        );
    } catch (error) {
        logger.error(
            `[transcriptionsHandler.exportTranscription] => export transcription: failed | ${JSON.stringify(
                {
                    error: error.message,
                },
            )}`,
        );
        next(error);
    }
};

/*
- purpose: delete an offline transcription record and optionally clean up linked audio and AssemblyAI data
- inputs: request params id, request body deleteFromAssembly/deleteAudioFile, authenticated session user
- outputs: json response with delete result flags
- important behavior:
  - always deletes the database record first
  - does not attempt any transcription .txt file deletion
  - preserves optional audio-copy and AssemblyAI cleanup behavior
*/
const deleteDBTranscription = async (request, response, next) => {
    try {
        const { id } = request.params;
        const user = request.session.user;

        const { deleteFromAssembly = false, deleteAudioFile = false } =
            request.body || {};

        const transcription = await getTranscriptionByIdQuery(id);
        if (!transcription) {
            logger.warn(
                `[transcriptionsHandler.deleteDBTranscription] => delete db transcription: denied | ${JSON.stringify(
                    {
                        userId: user?.id,
                        resourceId: id,
                        reason: "transcription_not_found",
                    },
                )}`,
            );
            return response.status(404).json({
                success: false,
                message: `transcription with ID ${id} Not found`,
            });
        }

        if (transcription.user_id !== user.id && user.role !== "admin") {
            logger.warn(
                `[transcriptionsHandler.deleteDBTranscription] => delete db transcription: denied | ${JSON.stringify(
                    {
                        userId: user.id,
                        resourceId: id,
                        reason: "forbidden",
                    },
                )}`,
            );
            return response.status(403).json({
                success: false,
                message: "You are not Not Authorized to access this resource!",
            });
        }

        const results = {
            dbDeleted: false,
            assemblyDeleted: false,
            audioDeleted: false,
        };

        // Delete the database record first.
        const transcriptionDeleted = await deleteTranscriptionByIdQuery(id);
        if (!transcriptionDeleted) {
            throw new Error("Failed to delete transcription by ID.");
        }

        results.dbDeleted = true;

        logger.info(
            `[transcriptionsHandler.deleteDBTranscription] => delete database record: success | ${JSON.stringify(
                {
                    userId: user.id,
                    resourceId: id,
                },
            )}`,
        );

        // Optionally remove the local audio copy.
        if (deleteAudioFile) {
            deleteAudioFileCopy(transcription.file_name);
            results.audioDeleted = true;
        }

        // Optionally remove the AssemblyAI transcript.
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
                        `[transcriptionsHandler.deleteDBTranscription] => delete assembly transcript: success | ${JSON.stringify(
                            {
                                userId: user.id,
                                resourceId: transcription.transcript_id,
                            },
                        )}`,
                    );
                } else {
                    logger.warn(
                        `[transcriptionsHandler.deleteDBTranscription] => delete assembly transcript: denied | ${JSON.stringify(
                            {
                                userId: user.id,
                                resourceId: transcription.transcript_id,
                                reason: status,
                            },
                        )}`,
                    );
                }
            } catch (err) {
                logger.error(
                    `[transcriptionsHandler.deleteDBTranscription] => delete assembly transcript: failed | ${JSON.stringify(
                        {
                            userId: user.id,
                            resourceId: transcription.transcript_id,
                            error: err.message,
                        },
                    )}`,
                );
            }
        }

        logger.info(
            `[transcriptionsHandler.deleteDBTranscription] => delete db transcription: success | ${JSON.stringify(
                {
                    userId: user.id,
                    resourceId: id,
                },
            )}`,
        );

        return response.json({
            success: true,
            message: `transcription with ID ${id} successfully deleted.`,
            results,
        });
    } catch (error) {
        logger.error(
            `[transcriptionsHandler.deleteDBTranscription] => delete db transcription: failed | ${JSON.stringify(
                {
                    error: error.message,
                },
            )}`,
        );
        next(error);
    }
};

const fetchAssemblyAIHistory = async (request, response, next) => {
    try {
        const user = request.session.user;
        const data = await fetchAssemblyHistory({ user });

        logger.info(
            `[transcriptionsHandler.fetchAssemblyAIHistory] => fetch assembly history: success | ${JSON.stringify(
                {
                    userId: user?.id,
                    transcriptionCount: Array.isArray(data) ? data.length : 0,
                },
            )}`,
        );

        response.status(200).json({
            success: true,
            message: "API Transcription fetched successfully",
            data,
        });
    } catch (error) {
        logger.error(
            `[transcriptionsHandler.fetchAssemblyAIHistory] => fetch assembly history: failed | ${JSON.stringify(
                {
                    error: error.message,
                },
            )}`,
        );
        next(error);
    }
};

const deleteAssemblyAiTranscript = async (request, response, next) => {
    try {
        const { transcriptId } = request.params;
        const user = request.session.user;

        if (!user?.id) {
            logger.warn(
                `[transcriptionsHandler.deleteAssemblyAiTranscript] => delete assembly transcript: denied | ${JSON.stringify(
                    {
                        resourceId: transcriptId,
                        reason: "missing_session_user",
                    },
                )}`,
            );
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
                `[transcriptionsHandler.deleteAssemblyAiTranscript] => delete assembly transcript: denied | ${JSON.stringify(
                    {
                        userId: user.id,
                        resourceId: transcriptId,
                        reason: status,
                    },
                )}`,
            );
            throw new Error("Failed to delete transcript from AssemblyAI.");
        }

        logger.info(
            `[transcriptionsHandler.deleteAssemblyAiTranscript] => delete assembly transcript: success | ${JSON.stringify(
                {
                    userId: user.id,
                    resourceId: transcriptId,
                },
            )}`,
        );
        response.json({
            success: true,
            message: `Transcript with ID ${transcriptId} deleted from AssemblyAI API`,
        });
    } catch (error) {
        logger.error(
            `[transcriptionsHandler.deleteAssemblyAiTranscript] => delete assembly transcript: failed | ${JSON.stringify(
                {
                    error: error.message,
                },
            )}`,
        );
        next(error);
    }
};

/*
- purpose: restore an offline transcription row from backup data
- inputs: request with transcript_id and optional fallback metadata from the client
- outputs: restored transcription row in the offline table
- important behavior:
  - uses backup data as the source of truth when available
  - prevents duplicate offline rows for the same transcript_id
  - rebuilds stored options and transcript text from backup data
*/
const restoreTranscription = async (request, response, next) => {
    try {
        const user = request.session.user;
        const userId = user?.id;

        const {
            transcript_id,
            file_name: clientFileName,
            audio_duration: clientAudioDuration,
        } = request.body;

        if (!userId) {
            logger.warn(
                `[transcriptionsHandler.restoreTranscription] => restore transcription: denied | ${JSON.stringify(
                    {
                        resourceId: transcript_id,
                        reason: "missing_session_user",
                    },
                )}`,
            );
            return response.status(401).json({
                success: false,
                message: "User not authenticated",
            });
        }

        // Required fields
        if (!transcript_id) {
            logger.warn(
                `[transcriptionsHandler.restoreTranscription] => validate restore payload: denied | ${JSON.stringify(
                    {
                        userId,
                        reason: "missing_transcript_id",
                    },
                )}`,
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
                `[transcriptionsHandler.restoreTranscription] => restore transcription: denied | ${JSON.stringify(
                    {
                        userId,
                        resourceId: transcript_id,
                        reason: "transcript_already_exists",
                    },
                )}`,
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
                `[transcriptionsHandler.restoreTranscription] => restore transcription: denied | ${JSON.stringify(
                    {
                        userId,
                        resourceId: transcript_id,
                        reason: "backup_not_found",
                    },
                )}`,
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
        const restoredCategory = backup.category ?? null;

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
                `[transcriptionsHandler.restoreTranscription] => derive transcription text: denied | ${JSON.stringify(
                    {
                        userId,
                        resourceId: transcript_id,
                        reason: "missing_transcription_text",
                    },
                )}`,
            );
        }

        // Insert restored transcription into offline table
        const inserted = await insertTranscriptionQuery({
            user_id: userId,
            file_name: restoredFileName,
            transcript_id,
            transcription: transcriptionText,
            options,
            category: restoredCategory,
            file_recorded_at: restoredRecordedAt,
            audio_duration: restoredAudioDuration,
            assemblyai_connection_id: backup.assemblyai_connection_id ?? null,
            assemblyai_connection_label:
                backup.assemblyai_connection_label ?? null,
            assemblyai_connection_source:
                backup.assemblyai_connection_source ?? "legacy_unknown",
        });
        logger.info(
            `[transcriptionsHandler.restoreTranscription] => restore transcription: success | ${JSON.stringify(
                {
                    userId,
                    resourceId: transcript_id,
                },
            )}`,
        );

        return response.status(201).json({
            success: true,
            message: "Transcript restored to offline successfully",
            data: inserted,
        });
    } catch (error) {
        logger.error(
            `[transcriptionsHandler.restoreTranscription] => restore transcription: failed | ${JSON.stringify(
                {
                    error: error.message,
                },
            )}`,
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
            logger.warn(
                `[transcriptionsHandler.streamAudioFile] => validate audio file path: denied | ${JSON.stringify(
                    {
                        resourceId: safeName,
                        reason: "invalid_file_name",
                    },
                )}`,
            );
            return response.status(400).json({ message: "Invalid file name" });
        }

        if (!fs.existsSync(audioPath)) {
            logger.warn(
                `[transcriptionsHandler.streamAudioFile] => stream audio file: denied | ${JSON.stringify(
                    {
                        resourceId: safeName,
                        reason: "audio_file_not_found",
                    },
                )}`,
            );
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
                logger.warn(
                    `[transcriptionsHandler.streamAudioFile] => validate audio range: denied | ${JSON.stringify(
                        {
                            resourceId: safeName,
                            reason: "invalid_range",
                        },
                    )}`,
                );
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
            stream.on("error", (error) => {
                logger.error(
                    `[transcriptionsHandler.streamAudioFile] => stream audio file: failed | ${JSON.stringify(
                        {
                            resourceId: safeName,
                            error: error.message,
                        },
                    )}`,
                );
                next(error);
            });
            logger.info(
                `[transcriptionsHandler.streamAudioFile] => stream audio file: success | ${JSON.stringify(
                    {
                        resourceId: safeName,
                    },
                )}`,
            );
            return stream.pipe(response);
        }

        response.writeHead(200, {
            "Content-Length": fileSize,
            "Content-Type": contentType,
            "Accept-Ranges": "bytes",
        });

        const stream = fs.createReadStream(audioPath);
        stream.on("error", (error) => {
            logger.error(
                `[transcriptionsHandler.streamAudioFile] => stream audio file: failed | ${JSON.stringify(
                    {
                        resourceId: safeName,
                        error: error.message,
                    },
                )}`,
            );
            next(error);
        });
        return stream.pipe(response);
    } catch (err) {
        logger.error(
            `[transcriptionsHandler.streamAudioFile] => stream audio file: failed | ${JSON.stringify(
                {
                    error: err.message,
                },
            )}`,
        );
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
    category = null,
    selectedAssemblyConnectionId = null,
    useAppFallback = false,
}) => {
    const job = transcriptionJobs[jobId];
    if (!job) {
        logger.warn(
            `[transcriptionsHandler.runTranscriptionJob] => run transcription job: denied | ${JSON.stringify(
                {
                    jobId,
                    reason: "job_not_found",
                },
            )}`,
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
            logger.warn(
                `[transcriptionsHandler.runTranscriptionJob] => run transcription job: denied | ${JSON.stringify(
                    {
                        jobId,
                        reason: "missing_user",
                    },
                )}`,
            );
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
            logger.warn(
                `[transcriptionsHandler.runTranscriptionJob] => validate audio file: denied | ${JSON.stringify(
                    {
                        userId: loggedUserId,
                        jobId,
                        reason: "missing_audio_file",
                    },
                )}`,
            );
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
            category,
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
            `[transcriptionsHandler.runTranscriptionJob] => store transcription backup: success | ${JSON.stringify(
                {
                    userId: loggedUserId,
                    jobId,
                    resourceId: transcriptId,
                },
            )}`,
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
            category,
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

        //  COMPLETE
        // Emit the finalized offline transcript payload used by the client immediately
        // after upload so history/detail views do not need a refetch for timing data.
        setStepStatus(steps, TRANSCRIPTION_STEPS.COMPLETE, "success", null);
        job.result = insertedTranscription;
        job.error = null;

        emitter.emit("completed", {
            jobId,
            steps,
            message: `Transcription created and stored successfully `,
            transcriptData: {
                ...insertedTranscription,
                utterances: extractUtterances(transcript),
                words: extractWords(transcript),
            },
        });

        logger.info(
            `[transcriptionsHandler.runTranscriptionJob] => run transcription job: success | ${JSON.stringify(
                {
                    userId: loggedUserId,
                    jobId,
                    resourceId: transcriptId,
                },
            )}`,
        );
    } catch (err) {
        const msg = err && err.message ? err.message : String(err);
        logger.error(
            `[transcriptionsHandler.runTranscriptionJob] => run transcription job: failed | ${JSON.stringify(
                {
                    jobId,
                    error: msg,
                },
            )}`,
        );
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
            `[transcriptionsHandler.storeTranscriptionText] => prepare transcription text: success | ${JSON.stringify(
                {
                    userId: transcriptData.user_id,
                    resourceId: transcriptData.transcript_id,
                    textLength: transcriptionText.length,
                },
            )}`,
        );

        const transcriptionDataToInsert = {
            transcription: transcriptionText,
            ...transcriptData,
        };

        const insertedTranscription = await insertTranscriptionQuery({
            ...transcriptionDataToInsert,
        });

        logger.info(
            `[transcriptionsHandler.storeTranscriptionText] => store transcription text: success | ${JSON.stringify(
                {
                    userId: transcriptData.user_id,
                    resourceId: transcriptData.transcript_id,
                },
            )}`,
        );

        return insertedTranscription;
    } catch (error) {
        logger.error(
            `[transcriptionsHandler.storeTranscriptionText] => store transcription text: failed | ${JSON.stringify(
                {
                    userId: transcriptData.user_id,
                    resourceId: transcriptData.transcript_id,
                    error: error.message,
                },
            )}`,
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
