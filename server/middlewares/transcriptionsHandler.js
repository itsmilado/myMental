// middleWares/transcriptionMiddleWare.js

// Import required modules and utilities
const { saveTranscriptionToFile } = require("../utils/fileProcessor");
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
} = require("../db/transcribeQueries");
const logger = require("../utils/logger");
const { assemblyClient } = require("../utils/assemblyaiClient");
const { fetchAssemblyHistory } = require("../utils/assemblyaiHistory");
const { exportTranscriptionToFile } = require("../utils/exportService");
const { error, log } = require("winston");
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
 * In-memory job registry (per-process)
 * jobs[jobId] = { steps, emitter, result, error, createdAt }
 */
const transcriptionJobs = {};

/**
 * SSE-enabled entry point:
 *  - expects multipart form with file (field: "audio") + options + fileModifiedDate
 *  - creates a jobId and starts runTranscriptionJob in the background
 *  - returns { jobId } immediately
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

        // Parse options from multipart body
        let userOptions = {};
        if (request.body.options) {
            userOptions =
                typeof request.body.options === "string"
                    ? JSON.parse(request.body.options)
                    : request.body.options;
        }

        const rawDate = request.body.fileModifiedDate || null;

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
            `[startTranscriptionJob] => Created job ${jobId} for user ${user.id}`
        );

        // fire & forget: run worker in background
        runTranscriptionJob({
            jobId,
            user,
            filePath: file.path,
            filename: file.filename,
            rawDate,
            userOptions,
        }).catch((err) => {
            logger.error(
                `[startTranscriptionJob] => Unhandled error in job ${jobId}: ${err.message}`
            );
        });

        // 202 Accepted: processing is happening asynchronously
        return response.status(202).json({
            success: true,
            jobId,
        });
    } catch (error) {
        logger.error(
            `[startTranscriptionJob] => Error starting job: ${error.message}`
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
            `[streamTranscriptionProgress] => Error streaming SSE: ${error.message}`
        );
        next(error);
    }
};

/**
 * Create a new transcription from an uploaded audio file.
 * Handles file upload, transcription request, polling, DB storage, and file export.
 * Logs all major steps and errors.
 */
const createTranscription = async (request, response, next) => {
    try {
        const loggedUserId = request.session.user.id;
        const userRole = request.session.user.role;
        const { path: filePath, filename } = request.file;
        const rawDate = request.body.fileModifiedDate; // safe for DB
        const fileModifiedDate = rawDate ? new Date(rawDate) : "00.00.00";

        logger.info(
            `Incoming request to Transcribe from user_id ${loggedUserId} to "${request.method} ${request.originalUrl}"`
        );

        // Parse user options from request body
        let userOptions = {};
        userOptions =
            typeof request.body.options === "string"
                ? JSON.parse(request.body.options)
                : request.body.options;

        // Upload the audio file to AssemblyAI API
        const uploadUrl = await uploadAudioFile(filePath);

        // Prepare transcription options for API
        const transcriptionOptions = {
            audio_url: uploadUrl,
            ...userOptions,
        };

        // Request a transcription from AssemblyAI
        const transcriptId = await requestTranscription(transcriptionOptions);

        // Poll for transcription result
        const transcript = await pollTranscriptionResult(transcriptId);

        // Store transcription in the database

        // Create response backup
        const createBackup = await insertTranscriptionBackupQuery({
            transcript_id: transcriptId, //transcript_id as per API
            user_id: loggedUserId,
            user_role: userRole,
            raw_api_data: transcript, // This is a JS object; pg will handle JSONB
        });

        if (!createBackup) {
            throw error;
        }

        logger.info(
            `[transcriptionHandler - createTranscription] => insertTranscriptionBackupQuery: Transcript's API response for User ${loggedUserId} with role ${userRole} successfully stored. `
        );

        const {
            audio_duration,
            language_code,
            speech_model,
            entity_detection,
            sentiment_analysis,
            speaker_labels,
            speakers_expected,
            punctuate,
            format_text,
        } = transcript;

        const resTranscriptOptions = {
            language_code: language_code,
            speech_model: speech_model,
            entity_detection: entity_detection,
            sentiment_analysis: sentiment_analysis,
            speaker_labels: speaker_labels,
            speakers_expected: speakers_expected,
            punctuate: punctuate,
            format_text: format_text,
        };

        const transcriptData = {
            user_id: loggedUserId,
            file_name: filename,
            audio_duration: audio_duration,
            transcript_id: transcriptId,
            options: resTranscriptOptions,
            file_recorded_at: fileModifiedDate,
            transcriptObject: transcript,
        };
        const insertedTranscription = await storeTranscriptionText({
            transcriptData,
        });

        // Save the transcription to a file
        const storedTxtfilePath = saveTranscriptionToFile(
            filename,
            insertedTranscription.transcription
        );

        // Send response to client
        response.status(200).json({
            success: true,
            message: `Transcription created and stored successfully at: ${storedTxtfilePath}`,
            TranscriptData: insertedTranscription,
        });
    } catch (error) {
        logger.error(`[createTranscription] => Error: ${error.message}`);
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
            `Incoming request to ${request.method} ${request.originalUrl}`
        );

        const transcriptions = await getAllTranscriptionsQuery();
        if (!transcriptions) {
            response
                .status(404)
                .json({ success: false, message: "No transcriptions found" });
            return;
        }

        logger.info(
            `[transcriptionsMiddleware - fetchAllTranscriptions] => Transcriptions retrieved`
        );
        response.status(200).json({
            success: true,
            message: "Transcriptions found",
            data: transcriptions,
        });
    } catch (error) {
        logger.error(
            `[transcriptionsMiddleware - getAllTranscriptions] => Error fetching transcriptions: ${error.message}`
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
            `Incoming request to ${request.method} ${request.originalUrl}`
        );
        const userId = request.session.user.id;
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
        logger.info(
            `[transcriptionsMiddleware - fetchFilteredTranscriptions] => Filters: ${JSON.stringify(
                filters
            )}`
        );
        const transcriptions = await getFilteredTranscriptionsQuery(filters);
        if (!transcriptions) {
            response
                .status(404)
                .json({ success: false, message: "No transcriptions found" });
            return;
        }
        logger.info(
            `[transcriptionsMiddleware - fetchFilteredTranscriptions] => Filtered Transcriptions retrieved`
        );
        response.status(200).json({
            success: true,
            message: "Transcriptions found",
            data: transcriptions,
        });
    } catch (error) {
        logger.error(
            `[transcriptionsMiddleware - getAllTranscriptions] => Error fetching transcriptions: ${error.message}`
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
            `Incoming request to ${request.method} ${request.originalUrl}`
        );
        const { id } = request.params;
        // Fetch the transcription by ID
        const transcription = await getTranscriptionByIdQuery(id);
        if (!transcription) {
            logger.warn(
                `[transcriptionsMiddleware - fetchTranscriptionById] => Transcription with ID: ${id} not found`
            );
            response.status(401).json({
                success: false,
                message: `Transcription with ID: ${id} does not exist`,
            });
            return false;
        }
        logger.info(
            `[transcriptionsMiddleware - fetchTranscriptionById] => Transcription fetched with ID: ${id}`
        );
        response.status(200).json({
            success: true,
            message: "Transcription retrieved successfully",
            data: transcription,
        });
    } catch (error) {
        logger.error(
            `[transcriptionsMiddleware - fetchTranscriptionById] => Error fetching transcription with ID: ${error.message}`
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
        const { transcriptId } = request.params;
        logger.info(
            `Incoming request to ${request.method} ${
                request.originalUrl
            }, params: ${JSON.stringify(request.params)}`
        );
        // Fetch the transcription by API transcript ID
        const transcription = await getTranscriptionByApiTranscriptIdQuery(
            transcriptId
        );
        if (!transcription) {
            logger.warn(
                `[transcriptionsMiddleware - fetchTranscriptionByApiId] => Transcription with API ID: ${transcriptId} not found`
            );
            response.status(401).json({
                success: false,
                message: `Transcription with API ID: ${transcriptId} does not exist`,
            });
            return false;
        }
        logger.info(
            `[transcriptionsMiddleware - fetchTranscriptionByApiId] => Transcription fetched with API ID: ${transcriptId}`
        );
        response.status(200).json({
            success: true,
            message: "Transcription fetched successfully",
            data: transcription,
        });
    } catch (error) {
        logger.error(
            `[transcriptionsMiddleware - fetchTranscriptionByApiId] => Error fetching transcription: ${error.message}`
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
        logger.info(
            `Incoming request to ${request.method} ${
                request.originalUrl
            } body: ${JSON.stringify(
                request.body
            )}, transcript_id: ${transcript_id}`
        ); // Log the request URL

        const transcript = await assemblyClient.transcripts.get(
            `${transcript_id}`
        );
        if (!transcript) {
            logger.error(
                `[transcriptionsMiddleware - fetchApiTranscriptionById] => Error fetching transcription by ID: ${error.message}`
            );
            response.status(500).json({
                success: false,
                message: "Error fetching transcription from API by ID",
            });
            throw new Error("Error fetching transcription from API by ID");
        }

        logger.info(
            `[transcriptionsMiddleware - fetchApiTranscriptionById] => Transcription fetched by ID: ${transcript_id}`
        );
        response.status(200).json({
            success: true,
            message: "Transcription fetched successfully",
            data: transcript,
        });
    } catch (error) {
        logger.error(
            `[transcriptionsMiddleware - fetchApiTranscriptionById] => Error fetching transcription : ${error.message}`
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
            `Incoming request to ${request.method} ${request.originalUrl}`
        ); // Log the request URL

        // Fetch transcription
        const transcription = await getTranscriptionByIdQuery(id);
        if (!transcription) {
            logger.error(
                `[transcriptionsMiddleware - fetchApiTranscriptionById] => Error fetching transcription by ID: ${error.message}`
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
            format
        );

        logger.info(
            `[transcriptionsMiddleware - exportTranscription] => file name: ${fileName} `
        );

        response.setHeader("Content-Type", mime);
        response.setHeader(
            "Content-Disposition",
            `attachment; filename="${fileName}"`
        );
        response.send(buffer);
        logger.info(
            `[transcriptionsMiddleware - exportTranscription] User ${request.session.user.id} exported ${transcription.transcript_id} as ${format}`
        );
    } catch (error) {
        logger.error(
            `[transcriptionsMiddleware - exportTranscription] => Error exporting transcription : ${error.message}`
        );
        next(error);
    }
};

const deleteDBTranscription = async (request, response, next) => {
    try {
        const { id } = request.params;
        const user = request.session.user;

        logger.info(
            `Incoming request to ${request.method} ${request.originalUrl}`
        ); // Log the request URL

        const transcription = await getTranscriptionByIdQuery(id);
        if (!transcription) {
            logger.error(
                `[transcriptionsMiddleware - fetchApiTranscriptionById] => transcription with ID ${id} Not found`
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

        // Only delete from DB
        const transcriptionDeleted = await deleteTranscriptionByIdQuery(id);
        if (!transcriptionDeleted) {
            logger.error(
                `[transcriptionsMiddleware - deleteDBTranscription] => Error delete transcription by ID: ${error.message}`
            );
            next(error);
        }
        logger.info(
            `[deleteTranscription] User ${user.id} deleted transcription ${id} from database`
        );
        // remove associated local files here
        response.json({
            success: true,
            message: `transcription with ID ${id} successfully deleted.`,
        });
    } catch (error) {
        next(error);
    }
};

const fetchAssemblyAIHistory = async (request, response, next) => {
    try {
        const user = request.session.user;
        const { transcript_id } = request.query;
        logger.info(
            `Incoming request to ${request.method} ${request.originalUrl}`
        ); // Log the request URL
        const transcriptions = await fetchAssemblyHistory();

        if (!transcriptions) {
            response.status(500).json({
                success: false,
                message: "Error fetching transcription from API by ID",
            });
            throw new Error("Error fetching transcription from API by ID");
        }

        const results = transcriptions.map((t) => ({
            transcript_id: t.transcript_id,
            created_at: t.created_at,
            status: t.status,
            audio_url: t.audio_url,
            audio_duration: t.audio_duration,
            speech_model: t.speech_model,
            language: t.language,
            transcription: flattenTranscription(t.transcript),
            // more fields if needed, e.g. features
        }));

        response.status(200).json({
            success: true,
            message: "API Transcription fetched successfully",
            data: results,
        });
    } catch (error) {
        logger.error(
            `[transcriptionsMiddleware - fetchAssemblyAIHistory] => Error fetching transcriptions: ${error.message}`
        );
        next(error);
    }
};

const deleteAssemblyAiTranscript = async (request, response, next) => {
    try {
        const { transcriptId } = request.params;
        const userId = request.session.user.id;
        logger.info(
            `Incoming request to ${request.method} ${request.originalUrl}, params: ${request.params}`
        ); // Log the request URL

        // Allow only if user is owner or admin
        if (!userId && request.session.user.role !== "admin") {
            logger.warn(
                `[transcriptionsMiddleware - deleteAssemblyAiTranscript] => Unauthorized access attempt: ${request.originalUrl} `
            );
            return response.status(403).json({
                success: false,
                message: "You are not Not Authorized to access this resource!",
            });
        }
        // Delete from AssemblyAI
        // This permanently removes sensitive transcript data
        const { status } = await assemblyClient.transcripts.delete(
            transcriptId
        );
        if (status !== "completed") {
            logger.warn(
                `[transcriptionsMiddleware - deleteAssemblyAiTranscript] => Request to ${request.originalUrl} not successfull.`
            );
            throw error;
        }
        logger.info(
            `[transcriptionsMiddleware - deleteAssemblyAiTranscript] => Transcript with ID ${transcriptId} deleted from AssemblyAI API `
        );
        response.json({
            success: true,
            message: `Transcript with ID ${transcriptId} deleted from AssemblyAI API`,
        });
    } catch (error) {
        logger.error(
            `[transcriptionsMiddleware - deleteAssemblyAiTranscript] => Error delete transcript: ${error.message}`
        );
        next(error);
    }
};

const restoreTranscription = async (request, response, next) => {
    try {
        const userId = request.session.user.id;
        const { transcript_id, transcription, file_recorded_at } = request.body;

        logger.info(
            `Incoming request to ${request.method} ${request.originalUrl}, params: ${request.params}`
        ); // Log the request URL

        // Check for required data
        if (!transcript_id || !transcription || !file_recorded_at) {
            logger.warn(
                `[transcriptionsMiddleware - restoreTranscription] => Missing fields. transcript_id? "${transcript_id}" or transcription? "${transcription}" or file_recorded_at? "${file_recorded_at}"`
            );
            return response
                .status(400)
                .json({ success: false, message: "Missing fields" });
        }

        // Prevent duplicate
        const existing = await getTranscriptionByApiTranscriptIdQuery(
            transcript_id
        );
        if (existing) {
            logger.warn(
                `[transcriptionsMiddleware - restoreTranscription] => Transcript with ID: ${transcript_id} already exsist in databse`
            );
            return response
                .status(409)
                .json({ success: false, message: "Transcript already exists" });
        }
        const file_name = buildRestoredFileName(file_recorded_at);
        // Insert to DB
        const inserted = await insertTranscriptionQuery({
            user_id: userId,
            file_name,
            transcript_id,
            transcription,
            file_recorded_at,
        });

        logger.info(
            `[transcriptionsMiddleware - restoreTranscription] => Transcript with ID ${transcript_id} restored from AssemblyAI API `
        );

        return response.status(201).json({
            success: true,
            message: "Transcript restored to offline successfully",
            data: inserted,
        });
    } catch (error) {
        logger.error(
            `[transcriptionsMiddleware - restoreTranscription] => Error restoring transcript with ID: ${transcript_id}, Error: ${error.message}`
        );
        next(error);
    }
};

// Helper functions

/**
 * Internal worker that runs the full transcription pipeline for one jobId.
 * Emits step events via job.emitter for SSE clients.
 */
const runTranscriptionJob = async ({
    jobId,
    user,
    filePath,
    filename,
    rawDate,
    userOptions,
}) => {
    const job = transcriptionJobs[jobId];
    if (!job) {
        logger.warn(
            `[runTranscriptionJob] => Job ${jobId} no longer exists in registry`
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

        // ----------------- INIT -----------------
        emitStep(TRANSCRIPTION_STEPS.INIT, "in_progress");

        if (!loggedUserId) {
            const msg = "User not authenticated";
            emitStep(TRANSCRIPTION_STEPS.INIT, "error", msg);
            setStepStatus(steps, TRANSCRIPTION_STEPS.COMPLETE, "error", msg);
            emitter.emit("error", { jobId, steps, message: msg });
            return;
        }

        if (!filePath || !filename) {
            const msg = "No audio file provided";
            emitStep(TRANSCRIPTION_STEPS.INIT, "error", msg);
            setStepStatus(steps, TRANSCRIPTION_STEPS.COMPLETE, "error", msg);
            emitter.emit("error", { jobId, steps, message: msg });
            return;
        }

        const fileModifiedDate = rawDate ? new Date(rawDate) : "00.00.00";
        const fileModifiedDisplayDate =
            fileModifiedDate instanceof Date &&
            !isNaN(fileModifiedDate.getTime())
                ? fileModifiedDate.toLocaleString("en-GB").replace(/\//g, ".")
                : "00.00.00";

        logger.info(
            `Incoming SSE transcription job ${jobId} from user_id ${loggedUserId}`
        );

        console.log(
            `[runTranscriptionJob] => jobId=${jobId}, filename=${filename}, fileModifiedDate=${fileModifiedDisplayDate}`
        );
        console.log(
            `[runTranscriptionJob] Received options: ${JSON.stringify(
                userOptions
            )}`
        );

        emitStep(TRANSCRIPTION_STEPS.INIT, "success");

        // ----------------- UPLOAD -----------------
        emitStep(TRANSCRIPTION_STEPS.UPLOAD, "in_progress");

        const uploadUrl = await uploadAudioFile(filePath);

        emitStep(TRANSCRIPTION_STEPS.UPLOAD, "success");

        // ----------------- TRANSCRIBE -----------------
        emitStep(TRANSCRIPTION_STEPS.TRANSCRIBE, "in_progress");

        const transcriptionOptions = {
            audio_url: uploadUrl,
            ...userOptions,
        };

        console.log(
            `[runTranscriptionJob] transcriptionOptions: ${JSON.stringify(
                transcriptionOptions
            )}`
        );

        const transcriptId = await requestTranscription(transcriptionOptions);
        const transcript = await pollTranscriptionResult(transcriptId);

        emitStep(TRANSCRIPTION_STEPS.TRANSCRIBE, "success");

        // ----------------- SAVE_DB -----------------
        emitStep(TRANSCRIPTION_STEPS.SAVE_DB, "in_progress");

        const createBackup = await insertTranscriptionBackupQuery({
            transcript_id: transcriptId, // as per API
            user_id: loggedUserId,
            user_role: userRole,
            raw_api_data: transcript,
        });

        if (!createBackup) {
            throw new Error(
                "Failed to insert transcription backup into database"
            );
        }

        logger.info(
            `[runTranscriptionJob] => insertTranscriptionBackupQuery: Transcript's API response for User ${loggedUserId} stored`
        );

        const {
            audio_duration,
            language_code,
            speech_model,
            entity_detection,
            sentiment_analysis,
            speaker_labels,
            speakers_expected,
            punctuate,
            format_text,
        } = transcript;

        const resTranscriptOptions = {
            language_code,
            speech_model,
            entity_detection,
            sentiment_analysis,
            speaker_labels,
            speakers_expected,
            punctuate,
            format_text,
        };

        const transcriptData = {
            user_id: loggedUserId,
            file_name: filename,
            audio_duration,
            transcript_id: transcriptId,
            options: resTranscriptOptions,
            file_recorded_at: fileModifiedDate,
            transcriptObject: transcript,
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
            fileModifiedDisplayDate
        );

        emitStep(TRANSCRIPTION_STEPS.SAVE_FILE, "success");

        // ----------------- COMPLETE -----------------
        setStepStatus(steps, TRANSCRIPTION_STEPS.COMPLETE, "success", null);
        job.result = insertedTranscription;

        emitter.emit("completed", {
            jobId,
            steps,
            message: `Transcription created and stored successfully at: ${storedTxtfilePath}`,
            TranscriptData: insertedTranscription,
        });

        logger.info(
            `[runTranscriptionJob] => job ${jobId} completed successfully`
        );
    } catch (err) {
        const msg = err && err.message ? err.message : String(err);
        logger.error(`[runTranscriptionJob] => Error in job ${jobId}: ${msg}`);
        job.error = msg;

        // mark complete as error
        setStepStatus(steps, TRANSCRIPTION_STEPS.COMPLETE, "error", msg);

        emitter.emit("error", {
            jobId,
            steps,
            message: msg,
        });
    } finally {
        // Cleanup job from memory after 10 minutes
        setTimeout(() => {
            delete transcriptionJobs[jobId];
        }, 10 * 60 * 1000);
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
            `[transcriptionMiddleware - createTranscription - storeTranscriptionText] => Transcription text prepared (length=${transcriptionText.length}).`
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
            `[transcriptionsMiddleware - storeTranscriptionText] => Error storing transcription: ${error.message}`
        );
        throw error;
    }
};

const buildRestoredFileName = (dateStr) => {
    const d = new Date(dateStr);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const hh = String(d.getHours()).padStart(2, "0");
    const min = String(d.getMinutes()).padStart(2, "0");
    const ss = String(d.getSeconds()).padStart(2, "0");
    return `restored-${yyyy}${mm}${dd}-${hh}${min}${ss}.txt`;
};

const flattenTranscription = (transcriptObject) => {
    if (!transcriptObject || !Array.isArray(transcriptObject.utterances))
        return "";
    return transcriptObject.utterances
        .map((u) => `Speaker ${u.speaker != null ? u.speaker : ""}: ${u.text}`)
        .join("\n");
};

// Export all middleware functions for use in routes
module.exports = {
    createTranscription,
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
};
