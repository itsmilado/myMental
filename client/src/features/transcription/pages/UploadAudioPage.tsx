import {
    Box,
    Button,
    Typography,
    TextField,
    Switch,
    FormControlLabel,
    Paper,
    Select,
    MenuItem,
    InputLabel,
    FormControl,
    Stepper,
    Step,
    StepLabel,
    LinearProgress,
    Alert,
} from "@mui/material";
import { useState, useRef, useEffect } from "react";
import {
    startTranscriptionJob,
    getTranscriptionProgressUrl,
    deleteTranscription,
} from "../../auth/api";

import { ExportButton } from "../components/ExportButton";
import { DeleteButton } from "../components/DeleteButton";

import {
    TranscriptionOptions,
    TranscriptData,
    TranscriptionStepKey,
    TranscriptionStepsState,
    StepEventPayload,
    CompletedEventPayload,
    ErrorEventPayload,
} from "../../../types/types";
import { formatDateTime } from "../../../utils/formatDate";
import { useTheme } from "@mui/material/styles";
import { tokens } from "../../../theme/theme";
import { TranscriptText } from "../components/TranscriptText";

const TRANSCRIPTION_STEP_ORDER: TranscriptionStepKey[] = [
    "init",
    "upload",
    "transcribe",
    "save_db",
    "save_file",
    "complete",
];

const createInitialStepsState = (): TranscriptionStepsState => ({
    init: { status: "pending", error: null },
    upload: { status: "pending", error: null },
    transcribe: { status: "pending", error: null },
    save_db: { status: "pending", error: null },
    save_file: { status: "pending", error: null },
    complete: { status: "pending", error: null },
});

const getActiveStepIndexFromSteps = (
    steps: TranscriptionStepsState,
    order: TranscriptionStepKey[] = TRANSCRIPTION_STEP_ORDER,
): number => {
    let lastIndex = 0;
    order.forEach((key, index) => {
        const step = steps[key];
        if (!step) return;
        if (step.status === "success" || step.status === "in_progress") {
            lastIndex = index;
        }
    });
    return lastIndex;
};

const labelForStepKey = (key: TranscriptionStepKey): string => {
    switch (key) {
        case "init":
            return "Initialize";
        case "upload":
            return "Upload";
        case "transcribe":
            return "Transcribe";
        case "save_db":
            return "Save to Database";
        case "save_file":
            return "Save File";
        case "complete":
            return "Complete";
        default:
            return key;
    }
};

const defaultTranscriptionOptions: TranscriptionOptions = {
    speaker_labels: false,
    speakers_expected: 2,
    sentiment_analysis: false,
    speech_model: "slam-1",
    language_code: "en_us",
    format_text: false,
    punctuate: false,
    entity_detection: false,
};

const modelLanguages: Record<string, string[]> = {
    "slam-1": ["en", "en_uk", "en_us"],
    universal: ["en", "en_uk", "en_us", "es", "de", "fr"],
    nano: ["en", "en_uk", "en_us", "es", "de", "fr"],
};

export const UploadAudioPage = () => {
    const theme = useTheme();
    const colors = tokens(theme.palette.mode);
    const [file, setFile] = useState<File | null>(null);
    const [options, setOptions] = useState<TranscriptionOptions>(
        defaultTranscriptionOptions,
    );
    const [results, setResults] = useState<TranscriptData | null>(null);
    const [loading, setLoading] = useState(false);

    const [jobId, setJobId] = useState<string | null>(null);
    const [stepsState, setStepsState] = useState<TranscriptionStepsState>(
        createInitialStepsState,
    );
    const [activeStepIndex, setActiveStepIndex] = useState<number>(0);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const eventSourceRef = useRef<EventSource | null>(null);

    useEffect(() => {
        return () => {
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
            }
        };
    }, []);

    const handleUpload = async (): Promise<void> => {
        if (!file) {
            return;
        }

        // Clean up any previous EventSource
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
            eventSourceRef.current = null;
        }

        setLoading(true);
        setErrorMessage(null);
        setResults(null);
        setStepsState(createInitialStepsState());
        setActiveStepIndex(0);
        setJobId(null);

        const userOptions: Partial<TranscriptionOptions> = {};

        if (options.speaker_labels) userOptions.speaker_labels = true;
        if (options.sentiment_analysis) userOptions.sentiment_analysis = true;
        if (options.entity_detection) userOptions.entity_detection = true;
        if (options.punctuate) userOptions.punctuate = true;
        if (options.format_text) userOptions.format_text = true;
        if (options.speaker_labels) {
            userOptions.speakers_expected = options.speakers_expected;
        }
        userOptions.speech_model = options.speech_model;
        userOptions.language_code = options.language_code;

        try {
            console.log("userOptions:", userOptions);

            // 1) Start background job
            const startResponse = await startTranscriptionJob(
                file,
                userOptions,
            );
            const newJobId = startResponse.jobId;
            setJobId(newJobId);

            // 2) Open SSE connection for progress
            const url = getTranscriptionProgressUrl(newJobId);
            const eventSource = new EventSource(url, { withCredentials: true });
            eventSourceRef.current = eventSource;

            eventSource.addEventListener("step", (event: MessageEvent) => {
                const payload = JSON.parse(event.data) as StepEventPayload;
                setStepsState(payload.steps);
                setActiveStepIndex(
                    getActiveStepIndexFromSteps(
                        payload.steps,
                        TRANSCRIPTION_STEP_ORDER,
                    ),
                );
            });

            eventSource.addEventListener("completed", (event: MessageEvent) => {
                const payload = JSON.parse(event.data) as CompletedEventPayload;
                setStepsState(payload.steps);
                setActiveStepIndex(
                    getActiveStepIndexFromSteps(
                        payload.steps,
                        TRANSCRIPTION_STEP_ORDER,
                    ),
                );
                setResults(payload.TranscriptData);
                setLoading(false);
                eventSource.close();
                eventSourceRef.current = null;
            });

            eventSource.addEventListener("error", (event: MessageEvent) => {
                try {
                    if (event.data) {
                        const payload = JSON.parse(
                            event.data as string,
                        ) as ErrorEventPayload;
                        setErrorMessage(
                            payload.error ||
                                "An error occurred during transcription.",
                        );
                        if (payload.steps) {
                            setStepsState(payload.steps);
                            setActiveStepIndex(
                                getActiveStepIndexFromSteps(
                                    payload.steps,
                                    TRANSCRIPTION_STEP_ORDER,
                                ),
                            );
                        }
                    } else {
                        setErrorMessage(
                            "An error occurred during transcription (no data).",
                        );
                    }
                } catch {
                    setErrorMessage("An error occurred during transcription.");
                }
                setLoading(false);
                eventSource.close();
                eventSourceRef.current = null;
            });
        } catch (error) {
            console.error("Upload error:", error);
            setErrorMessage(
                error instanceof Error
                    ? error.message
                    : "Failed to start transcription job.",
            );
            setLoading(false);
        }
    };

    return (
        <Paper sx={{ p: 4, display: "flex", flexDirection: "column", gap: 2 }}>
            <Typography variant="h5">Transcribe Audio</Typography>

            <Box mt={2} mb={3}>
                <Stepper
                    activeStep={activeStepIndex}
                    alternativeLabel
                    sx={{
                        "& .MuiStepLabel-label": {
                            color: colors.grey[300],
                        },
                        "& .MuiStepLabel-label.Mui-active": {
                            color: colors.greenAccent[500],
                            fontWeight: 600,
                        },
                        "& .MuiStepLabel-label.Mui-completed": {
                            color: colors.greenAccent[400],
                        },
                        "& .MuiStepIcon-root": {
                            color: colors.grey[500],
                        },
                        "& .MuiStepIcon-root.Mui-active": {
                            color: colors.greenAccent[500],
                        },
                        "& .MuiStepIcon-root.Mui-completed": {
                            color: colors.greenAccent[500],
                        },
                        "& .MuiStepLabel-root.Mui-error .MuiStepLabel-label": {
                            color: theme.palette.error.main,
                        },
                        "& .MuiStepLabel-root.Mui-error .MuiStepIcon-root": {
                            color: theme.palette.error.main,
                        },
                    }}
                >
                    {TRANSCRIPTION_STEP_ORDER.map((key) => (
                        <Step key={key}>
                            <StepLabel
                                error={stepsState[key].status === "error"}
                            >
                                {labelForStepKey(key)}
                            </StepLabel>
                        </Step>
                    ))}
                </Stepper>

                {loading && (
                    <Box mt={2}>
                        <LinearProgress
                            sx={{
                                "& .MuiLinearProgress-bar": {
                                    backgroundColor: colors.greenAccent[500],
                                },
                            }}
                        />
                    </Box>
                )}

                {errorMessage && (
                    <Box mt={2}>
                        <Alert severity="error" variant="outlined">
                            {errorMessage}
                        </Alert>
                    </Box>
                )}
            </Box>

            <Button
                variant="outlined"
                component="label"
                sx={{
                    color: colors.grey[100],
                    borderColor: colors.grey[300],
                    "&:hover": {
                        borderColor: colors.grey[200],
                        backgroundColor: theme.palette.action.hover,
                    },
                }}
            >
                Select Audio File
                <input
                    hidden
                    type="file"
                    accept="audio/*"
                    onChange={(e) => {
                        const selected = e.target.files?.[0];
                        if (selected) setFile(selected);
                    }}
                />
            </Button>

            {file && (
                <Typography variant="body2">Selected: {file.name}</Typography>
            )}

            <Box display="flex" flexDirection="column" gap={1}>
                <FormControlLabel
                    control={
                        <Switch
                            checked={options.speaker_labels}
                            onChange={(e) =>
                                setOptions((o) => ({
                                    ...o,
                                    speaker_labels: e.target.checked,
                                }))
                            }
                            sx={{
                                // thumb color when checked
                                "& .MuiSwitch-switchBase.Mui-checked": {
                                    color: colors.greenAccent[500],
                                },
                                // track color when checked
                                "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track":
                                    {
                                        backgroundColor:
                                            colors.greenAccent[500],
                                    },
                            }}
                        />
                    }
                    label="Speaker Labels"
                />
                <FormControlLabel
                    control={
                        <Switch
                            checked={options.sentiment_analysis}
                            onChange={(e) =>
                                setOptions((o) => ({
                                    ...o,
                                    sentiment_analysis: e.target.checked,
                                }))
                            }
                            sx={{
                                // thumb color when checked
                                "& .MuiSwitch-switchBase.Mui-checked": {
                                    color: colors.greenAccent[500],
                                },
                                // track color when checked
                                "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track":
                                    {
                                        backgroundColor:
                                            colors.greenAccent[500],
                                    },
                            }}
                        />
                    }
                    label="Sentiment Analysis"
                />
                <FormControlLabel
                    control={
                        <Switch
                            checked={options.entity_detection}
                            onChange={(e) =>
                                setOptions((o) => ({
                                    ...o,
                                    entity_detection: e.target.checked,
                                }))
                            }
                            sx={{
                                // thumb color when checked
                                "& .MuiSwitch-switchBase.Mui-checked": {
                                    color: colors.greenAccent[500],
                                },
                                // track color when checked
                                "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track":
                                    {
                                        backgroundColor:
                                            colors.greenAccent[500],
                                    },
                            }}
                        />
                    }
                    label="Entity Detection"
                />
                <TextField
                    label="Speakers Expected"
                    type="number"
                    value={options.speakers_expected}
                    disabled={!options.speaker_labels}
                    onChange={(e) =>
                        setOptions((o) => ({
                            ...o,
                            speakers_expected: parseInt(e.target.value) || 1,
                        }))
                    }
                    size="small"
                    sx={{
                        "& .MuiInputLabel-root.Mui-focused": {
                            color: colors.greenAccent[500],
                        },
                        "& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline":
                            {
                                borderColor: colors.greenAccent[500],
                            },
                    }}
                />
                <FormControl
                    size="small"
                    fullWidth
                    sx={{
                        // label base
                        "& .MuiInputLabel-root": {
                            color: colors.grey[100],
                        },
                        // label when focused
                        "& .MuiInputLabel-root.Mui-focused": {
                            color: colors.greenAccent[500],
                        },
                        // outline (default)
                        "& .MuiOutlinedInput-root .MuiOutlinedInput-notchedOutline":
                            {
                                borderColor: colors.grey[300],
                            },
                        // outline on hover
                        "& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline":
                            {
                                borderColor: colors.grey[200],
                            },
                        // outline when focused
                        "& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline":
                            {
                                borderColor: colors.greenAccent[500],
                            },
                    }}
                >
                    <InputLabel id="model-select-label">
                        Speech Model
                    </InputLabel>
                    <Select
                        labelId="model-select-label"
                        value={options.speech_model}
                        label="Speech Model"
                        onChange={(e) =>
                            setOptions((o) => ({
                                ...o,
                                speech_model: e.target.value,
                                language_code:
                                    modelLanguages[e.target.value][0],
                            }))
                        }
                    >
                        {Object.keys(modelLanguages).map((model) => (
                            <MenuItem
                                key={model}
                                value={model}
                                sx={{
                                    color: colors.grey[100],
                                    "&.Mui-selected": {
                                        backgroundColor: colors.primary[400],
                                        color: colors.greenAccent[500],
                                    },
                                    "&.Mui-selected:hover": {
                                        backgroundColor: colors.primary[300],
                                    },
                                }}
                            >
                                {model}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>

                <FormControl
                    size="small"
                    fullWidth
                    sx={{
                        // label base
                        "& .MuiInputLabel-root": {
                            color: colors.grey[100],
                        },
                        // label when focused
                        "& .MuiInputLabel-root.Mui-focused": {
                            color: colors.greenAccent[500],
                        },
                        // outline (default)
                        "& .MuiOutlinedInput-root .MuiOutlinedInput-notchedOutline":
                            {
                                borderColor: colors.grey[300],
                            },
                        // outline on hover
                        "& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline":
                            {
                                borderColor: colors.grey[200],
                            },
                        // outline when focused
                        "& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline":
                            {
                                borderColor: colors.greenAccent[500],
                            },
                    }}
                >
                    <InputLabel id="language-select-label">
                        Language Code
                    </InputLabel>
                    <Select
                        labelId="language-select-label"
                        value={options.language_code}
                        label="Language Code"
                        onChange={(e) =>
                            setOptions((o) => ({
                                ...o,
                                language_code: e.target.value,
                            }))
                        }
                    >
                        {modelLanguages[
                            options.speech_model as keyof typeof modelLanguages
                        ].map((lang) => (
                            <MenuItem
                                key={lang}
                                value={lang}
                                sx={{
                                    color: colors.grey[100],
                                    "&.Mui-selected": {
                                        backgroundColor: colors.primary[400],
                                        color: colors.greenAccent[500],
                                    },
                                    "&.Mui-selected:hover": {
                                        backgroundColor: colors.primary[300],
                                    },
                                }}
                            >
                                {lang}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
            </Box>

            <Button
                variant="contained"
                onClick={handleUpload}
                disabled={!file || loading}
            >
                {loading ? "Transcribing..." : "Upload & Transcribe"}
            </Button>

            {results && (
                <Box mt={4}>
                    <Typography variant="h6" mt={2} mb={1}>
                        New transcription created
                    </Typography>

                    <Box
                        display="flex"
                        justifyContent="space-between"
                        alignItems="center"
                        mb={2}
                        gap={2}
                    >
                        <Box>
                            <Typography variant="subtitle1">
                                {results.file_name}
                            </Typography>
                            <Typography variant="body2">
                                Recorded at:{" "}
                                {formatDateTime(results.file_recorded_at)}
                            </Typography>
                        </Box>

                        <Box display="flex" alignItems="center" gap={1}>
                            <ExportButton
                                transcriptId={results.id}
                                fileName={results.file_name}
                            />
                            <DeleteButton
                                label="Delete result"
                                onDelete={async ({
                                    deleteFromAssembly,
                                    deleteServerFiles,
                                }) => {
                                    const msg = await deleteTranscription(
                                        results.id,
                                        {
                                            deleteFromAssembly,
                                            deleteTxtFile: deleteServerFiles,
                                            deleteAudioFile: deleteServerFiles,
                                        },
                                    );
                                    // Remove the result from view once it’s deleted
                                    setResults(null);
                                    return msg;
                                }}
                            />
                        </Box>
                    </Box>

                    <TranscriptText
                        text={results.transcription}
                        utterances={results.utterances}
                        maxHeight={360}
                    />
                </Box>
            )}
        </Paper>
    );
};
