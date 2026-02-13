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
    FormControl,
    Stepper,
    Step,
    StepLabel,
    LinearProgress,
    Alert,
    Divider,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Chip,
    Tooltip,
    IconButton,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import UploadFileOutlinedIcon from "@mui/icons-material/UploadFileOutlined";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { useState, useRef, useEffect, useMemo } from "react";
import {
    startTranscriptionJob,
    getTranscriptionProgressUrl,
    deleteTranscription,
} from "../../auth/api";

import { ExportButton } from "../components/ExportButton";
import { DeleteButton } from "../components/DeleteButton";

import type {
    TranscriptionOptions,
    TranscriptData,
    TranscriptionStepKey,
    TranscriptionStepsState,
    StepEventPayload,
    CompletedEventPayload,
    ErrorEventPayload,
    SpeechModel,
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

    format_text: true,
    punctuate: true,
    entity_detection: false,
    sentiment_analysis: false,

    speech_models: ["slam-1"],
    language_code: "en_us",
};

const modelLanguages: Record<string, string[]> = {
    "universal-2": [
        "en",
        "en_uk",
        "en_us",
        "de",
        "fa",
        "ar",
        "es",
        "fr",
        "uk",
        "ru",
    ],
    "slam-1": ["en", "en_uk", "en_us"],
    nano: ["en", "en_uk", "en_us", "es", "de", "fr"],
};

const speechModelHelp: Record<string, string> = {
    "universal-2":
        "Advanced general-purpose model for pre-recorded audio with multi-lingual support, improved accuracy and low latency.",
    "slam-1":
        "Highest accuracy for transcribing English pre-recorded audio with fine-tuning support and customization.",
    nano: "Fast and lightweight for general transcription with multi-lingual support.",
};

const AUTO_LANGUAGE_CODE = "auto";

const languageLabels: Record<string, string> = {
    [AUTO_LANGUAGE_CODE]: "Automatic Language Detection",
    en: "English ( Global )",
    en_uk: "English ( British )",
    en_us: "English ( US )",
    de: "German",
    fa: "Persian ( Farsi )",
    ar: "Arabic",
    es: "Spanish",
    fr: "French",
    uk: "Ukrainian",
    ru: "Russian",
};

const getLanguageLabel = (code: string): string => {
    return languageLabels[code] ?? code;
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
    const [advancedOpen, setAdvancedOpen] = useState(false);

    const eventSourceRef = useRef<EventSource | null>(null);

    useEffect(() => {
        return () => {
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
            }
        };
    }, []);

    const transcriptMaxHeight = useMemo(() => {
        return "min(820px, calc(100vh - 360px))";
    }, []);

    const currentStepLabel = useMemo(() => {
        const safeIndex = Math.min(
            activeStepIndex,
            TRANSCRIPTION_STEP_ORDER.length - 1,
        );
        return labelForStepKey(TRANSCRIPTION_STEP_ORDER[safeIndex]);
    }, [activeStepIndex]);

    const rightPanelSubtitle = results
        ? "Transcript ready."
        : loading
          ? "Processing… this panel updates automatically."
          : "Select a file and start transcription to see results here.";

    const currentSpeechModel: SpeechModel =
        options.speech_models?.[0] ?? "slam-1";

    const currentModelLanguages = useMemo(() => {
        const langs = modelLanguages[currentSpeechModel] ?? [];
        return langs.length ? langs : ["en"];
    }, [currentSpeechModel]);

    const isUniversal2 = currentSpeechModel === "universal-2";
    const codeSwitchingEnabled = Boolean(
        options.language_detection_options?.code_switching,
    );

    useEffect(() => {
        // Hide/reset auto language detection + code switching when not using Universal-2.
        if (isUniversal2) return;

        setOptions((o) => {
            const model = o.speech_models?.[0] ?? "slam-1";
            const langs = modelLanguages[model] ?? ["en"];

            const nextLanguageCode =
                o.language_code === AUTO_LANGUAGE_CODE
                    ? (langs[0] ?? "en")
                    : o.language_code;

            const hadDetection =
                o.language_code === AUTO_LANGUAGE_CODE ||
                o.language_detection ||
                o.language_detection_options?.code_switching;

            if (!hadDetection) return o;

            return {
                ...o,
                language_code: nextLanguageCode,
                language_detection: false,
                language_detection_options: undefined,
            };
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentSpeechModel, isUniversal2]);

    useEffect(() => {
        // Enforce Code Switching contract for Universal-2.
        if (!isUniversal2) return;
        if (!codeSwitchingEnabled) return;

        if (
            options.language_code !== AUTO_LANGUAGE_CODE ||
            !options.language_detection
        ) {
            setOptions((o) => ({
                ...o,
                language_code: AUTO_LANGUAGE_CODE,
                language_detection: true,
                language_detection_options: { code_switching: true },
            }));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isUniversal2, codeSwitchingEnabled]);

    useEffect(() => {
        // Keep language_code valid when switching models (but do not override auto detection).
        if (options.language_code === AUTO_LANGUAGE_CODE) return;

        if (!currentModelLanguages.includes(options.language_code)) {
            setOptions((o) => ({
                ...o,
                language_code: currentModelLanguages[0],
            }));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentSpeechModel, currentModelLanguages, options.language_code]);

    const handleSelectModel = (model: SpeechModel): void => {
        if (model === currentSpeechModel) return;
        const langs = modelLanguages[model] ?? ["en"];

        setOptions((o) => {
            const nextIsUniversal2 = model === "universal-2";
            const prevWasAuto = o.language_code === AUTO_LANGUAGE_CODE;

            const nextLanguageCode = nextIsUniversal2
                ? prevWasAuto
                    ? AUTO_LANGUAGE_CODE
                    : langs.includes(o.language_code)
                      ? o.language_code
                      : (langs[0] ?? "en")
                : prevWasAuto
                  ? (langs[0] ?? "en")
                  : langs.includes(o.language_code)
                    ? o.language_code
                    : (langs[0] ?? "en");

            return {
                ...o,
                speech_models: [model],
                language_code: nextLanguageCode,
                language_detection: nextIsUniversal2
                    ? o.language_detection
                    : false,
                language_detection_options: nextIsUniversal2
                    ? o.language_detection_options
                    : undefined,
            };
        });
    };

    const handleUpload = async (): Promise<void> => {
        if (!file) return;

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

        // Keep payload logic consistent with existing behavior.
        if (options.speaker_labels) userOptions.speaker_labels = true;
        if (options.speaker_labels) {
            userOptions.speakers_expected = options.speakers_expected;
        }

        if (options.punctuate) userOptions.punctuate = true;
        if (options.format_text) userOptions.format_text = true;
        if (options.entity_detection) userOptions.entity_detection = true;
        if (options.sentiment_analysis) userOptions.sentiment_analysis = true;

        userOptions.speech_models = [currentSpeechModel];
        const isAutoLanguage = options.language_code === AUTO_LANGUAGE_CODE;
        if (isAutoLanguage || options.language_detection) {
            userOptions.language_detection = true;
            if (codeSwitchingEnabled) {
                userOptions.language_detection_options = {
                    code_switching: true,
                };
            }
        } else {
            userOptions.language_code = options.language_code;
        }

        try {
            const startResponse = await startTranscriptionJob(
                file,
                userOptions,
            );
            const newJobId = startResponse.jobId;
            setJobId(newJobId);

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
            setErrorMessage(
                error instanceof Error
                    ? error.message
                    : "Failed to start transcription job.",
            );
            setLoading(false);
        }
    };

    const renderModelButton = (model: SpeechModel) => {
        const selected = currentSpeechModel === model;

        return (
            <Button
                key={model}
                onClick={() => handleSelectModel(model)}
                variant="outlined"
                disableElevation
                sx={{
                    textTransform: "none",
                    borderRadius: 2,
                    px: 1.25,
                    py: 0.9,
                    minWidth: 0,
                    width: "fit-content",
                    borderColor: selected
                        ? colors.greenAccent[500]
                        : theme.palette.divider,
                    color: "text.primary",
                    backgroundColor: "transparent",
                    boxShadow: selected
                        ? `0 0 0 2px ${theme.palette.action.selected}`
                        : "none",
                    "&:hover": {
                        backgroundColor: theme.palette.action.hover,
                        borderColor: selected
                            ? colors.greenAccent[500]
                            : colors.grey[300],
                    },
                }}
            >
                <Box
                    sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 0.75,
                    }}
                >
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        {model}
                    </Typography>

                    <Tooltip
                        title={speechModelHelp[model]}
                        placement="top"
                        arrow
                        slotProps={{
                            tooltip: {
                                sx: {
                                    fontSize: "0.95rem",
                                    lineHeight: 1.5,
                                    maxWidth: 360,
                                    px: 1.5,
                                    py: 1.25,
                                },
                            },
                            arrow: {
                                sx: {
                                    color: "grey.900",
                                },
                            },
                        }}
                    >
                        <IconButton
                            size="small"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                            }}
                            sx={{
                                p: 0.25,
                                ml: 0.25,
                                color: "text.secondary",
                                "&:hover": {
                                    backgroundColor: theme.palette.action.hover,
                                },
                            }}
                        >
                            <InfoOutlinedIcon fontSize="inherit" />
                        </IconButton>
                    </Tooltip>
                </Box>
            </Button>
        );
    };

    return (
        <Box
            sx={{
                maxWidth: 1320,
                mx: "auto",
                px: { xs: 2, md: 3 },
                py: 3,
            }}
        >
            <Box
                sx={{
                    display: "flex",
                    flexDirection: { xs: "column", md: "row" },
                    gap: 3,
                    alignItems: "flex-start",
                }}
            >
                {/* Left panel */}
                <Paper
                    sx={{
                        p: 3,
                        width: { xs: "100%", md: 460 },
                        flex: { md: "0 0 460px" },
                        borderRadius: 3,
                        border: `1px solid ${theme.palette.divider}`,
                        display: "flex",
                        flexDirection: "column",
                        gap: 2,
                        minHeight: { md: "calc(100vh - 180px)" },
                        transition: "box-shadow 150ms ease",
                        "&:hover": { boxShadow: 2 },
                    }}
                >
                    <Box>
                        <Typography variant="h5">Transcribe Audio</Typography>
                        {jobId && (
                            <Typography
                                variant="body2"
                                sx={{ color: "text.secondary", mt: 0.5 }}
                            >
                                Job: {jobId}
                            </Typography>
                        )}
                    </Box>

                    <Box>
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
                                "& .MuiStepLabel-root.Mui-error .MuiStepLabel-label":
                                    {
                                        color: theme.palette.error.main,
                                    },
                                "& .MuiStepLabel-root.Mui-error .MuiStepIcon-root":
                                    {
                                        color: theme.palette.error.main,
                                    },
                            }}
                        >
                            {TRANSCRIPTION_STEP_ORDER.map((key) => (
                                <Step key={key}>
                                    <StepLabel
                                        error={
                                            stepsState[key].status === "error"
                                        }
                                    >
                                        {labelForStepKey(key)}
                                    </StepLabel>
                                </Step>
                            ))}
                        </Stepper>

                        {loading && (
                            <Box mt={2} aria-live="polite">
                                <LinearProgress
                                    sx={{
                                        "& .MuiLinearProgress-bar": {
                                            backgroundColor:
                                                colors.greenAccent[500],
                                        },
                                    }}
                                />
                                <Typography
                                    variant="body2"
                                    sx={{ color: "text.secondary", mt: 1 }}
                                >
                                    Current step: {currentStepLabel}
                                </Typography>
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

                    <Divider sx={{ borderColor: theme.palette.divider }} />

                    {/* File selection */}
                    <Button
                        variant="outlined"
                        component="label"
                        startIcon={<UploadFileOutlinedIcon />}
                        sx={{
                            color: colors.grey[100],
                            borderColor: colors.grey[300],
                            "&:hover": {
                                borderColor: colors.grey[200],
                                backgroundColor: theme.palette.action.hover,
                            },
                        }}
                        fullWidth
                    >
                        {file ? "Change Audio File" : "Choose Audio File"}
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

                    {file ? (
                        <Typography
                            variant="body2"
                            sx={{ color: "text.secondary" }}
                        >
                            Selected: {file.name}
                        </Typography>
                    ) : (
                        <Typography
                            variant="body2"
                            sx={{ color: "text.secondary" }}
                        >
                            Choose an audio file to begin.
                        </Typography>
                    )}

                    {/* Speech model (buttons with info icon tooltips) */}
                    <Box
                        sx={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 1,
                        }}
                    >
                        <Typography
                            variant="subtitle2"
                            sx={{ color: "text.secondary" }}
                        >
                            Select a model
                        </Typography>

                        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                            {renderModelButton("universal-2")}
                            {renderModelButton("slam-1")}
                            {renderModelButton("nano")}
                        </Box>
                    </Box>

                    {/* Language */}
                    <Box
                        sx={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 1,
                        }}
                    >
                        <Typography
                            variant="subtitle2"
                            sx={{ color: "text.secondary" }}
                        >
                            Language
                        </Typography>

                        <FormControl
                            size="small"
                            fullWidth
                            sx={{
                                "& .MuiOutlinedInput-notchedOutline": {
                                    borderColor: colors.grey[300],
                                },
                                "&:hover .MuiOutlinedInput-notchedOutline": {
                                    borderColor: colors.grey[200],
                                },
                                "& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline":
                                    {
                                        borderColor: colors.greenAccent[500],
                                    },
                            }}
                        >
                            <Select
                                value={options.language_code}
                                disabled={isUniversal2 && codeSwitchingEnabled}
                                onChange={(e) =>
                                    setOptions((o) => {
                                        const next = String(e.target.value);

                                        // Prevent selecting auto for non-Universal-2 models.
                                        if (
                                            !isUniversal2 &&
                                            next === AUTO_LANGUAGE_CODE
                                        ) {
                                            return o;
                                        }

                                        const selectingAuto =
                                            next === AUTO_LANGUAGE_CODE;

                                        return {
                                            ...o,
                                            language_code: next,
                                            language_detection: selectingAuto
                                                ? true
                                                : false,
                                            language_detection_options:
                                                selectingAuto
                                                    ? o.language_detection_options
                                                    : undefined,
                                        };
                                    })
                                }
                            >
                                {isUniversal2 && (
                                    <MenuItem value={AUTO_LANGUAGE_CODE}>
                                        {getLanguageLabel(AUTO_LANGUAGE_CODE)}
                                    </MenuItem>
                                )}

                                {currentModelLanguages.map((lang) => (
                                    <MenuItem key={lang} value={lang}>
                                        {getLanguageLabel(lang)}
                                    </MenuItem>
                                ))}
                            </Select>

                            {isUniversal2 && (
                                <FormControlLabel
                                    sx={{ mt: 0.5, ml: 0 }}
                                    control={
                                        <Switch
                                            checked={codeSwitchingEnabled}
                                            onChange={(e) => {
                                                const checked =
                                                    e.target.checked;
                                                setOptions((o) => ({
                                                    ...o,
                                                    language_detection: checked
                                                        ? true
                                                        : o.language_code ===
                                                            AUTO_LANGUAGE_CODE
                                                          ? true
                                                          : false,
                                                    language_code: checked
                                                        ? AUTO_LANGUAGE_CODE
                                                        : o.language_code,
                                                    language_detection_options:
                                                        checked
                                                            ? {
                                                                  code_switching: true,
                                                              }
                                                            : undefined,
                                                }));
                                            }}
                                            sx={{
                                                "& .MuiSwitch-switchBase.Mui-checked":
                                                    {
                                                        color: colors
                                                            .greenAccent[500],
                                                    },
                                                "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track":
                                                    {
                                                        backgroundColor:
                                                            colors
                                                                .greenAccent[500],
                                                    },
                                            }}
                                        />
                                    }
                                    label="Code switching"
                                />
                            )}
                        </FormControl>
                    </Box>

                    {/* Speaker labels */}
                    <Box
                        sx={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 1,
                        }}
                    >
                        <Typography
                            variant="subtitle2"
                            sx={{ color: "text.secondary", mt: 0.5 }}
                        >
                            Speakers
                        </Typography>

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
                                        "& .MuiSwitch-switchBase.Mui-checked": {
                                            color: colors.greenAccent[500],
                                        },
                                        "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track":
                                            {
                                                backgroundColor:
                                                    colors.greenAccent[500],
                                            },
                                    }}
                                />
                            }
                            label="Speaker labels"
                        />

                        <TextField
                            label="Speakers expected"
                            type="number"
                            value={options.speakers_expected}
                            disabled={!options.speaker_labels}
                            onChange={(e) =>
                                setOptions((o) => ({
                                    ...o,
                                    speakers_expected:
                                        parseInt(e.target.value) || 1,
                                }))
                            }
                            size="small"
                            helperText={
                                options.speaker_labels
                                    ? "Used to improve diarization."
                                    : "Enable speaker labels to configure."
                            }
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
                    </Box>

                    {/* Advanced options */}
                    <Box
                        sx={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 1,
                        }}
                    >
                        <Typography
                            variant="subtitle2"
                            sx={{ color: "text.secondary" }}
                        >
                            Advanced options
                        </Typography>

                        <Accordion
                            disableGutters
                            elevation={0}
                            expanded={advancedOpen}
                            onChange={() => setAdvancedOpen((v) => !v)}
                            sx={{
                                borderRadius: 2,
                                border: `1px solid ${theme.palette.divider}`,
                                backgroundColor: "transparent",
                                "&:before": { display: "none" },
                                "&.Mui-expanded": {
                                    margin: 0,
                                },
                            }}
                        >
                            <AccordionSummary
                                expandIcon={<ExpandMoreIcon />}
                                sx={{
                                    px: 1.5,
                                    minHeight: 44,
                                    "& .MuiAccordionSummary-content": {
                                        margin: 0,
                                    },
                                }}
                            >
                                <Typography
                                    variant="body2"
                                    sx={{ fontWeight: 600 }}
                                >
                                    Show advanced options
                                </Typography>
                            </AccordionSummary>

                            <AccordionDetails
                                sx={{
                                    px: 1.5,
                                    pt: 1,
                                    pb: 1.5,
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: 1.25,
                                }}
                            >
                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={options.format_text}
                                            onChange={(e) =>
                                                setOptions((o) => ({
                                                    ...o,
                                                    format_text:
                                                        e.target.checked,
                                                }))
                                            }
                                            sx={{
                                                "& .MuiSwitch-switchBase.Mui-checked":
                                                    {
                                                        color: colors
                                                            .greenAccent[500],
                                                    },
                                                "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track":
                                                    {
                                                        backgroundColor:
                                                            colors
                                                                .greenAccent[500],
                                                    },
                                            }}
                                        />
                                    }
                                    label="Format text"
                                />

                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={options.punctuate}
                                            onChange={(e) =>
                                                setOptions((o) => ({
                                                    ...o,
                                                    punctuate: e.target.checked,
                                                }))
                                            }
                                            sx={{
                                                "& .MuiSwitch-switchBase.Mui-checked":
                                                    {
                                                        color: colors
                                                            .greenAccent[500],
                                                    },
                                                "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track":
                                                    {
                                                        backgroundColor:
                                                            colors
                                                                .greenAccent[500],
                                                    },
                                            }}
                                        />
                                    }
                                    label="Punctuate"
                                />

                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={options.entity_detection}
                                            onChange={(e) =>
                                                setOptions((o) => ({
                                                    ...o,
                                                    entity_detection:
                                                        e.target.checked,
                                                }))
                                            }
                                            sx={{
                                                "& .MuiSwitch-switchBase.Mui-checked":
                                                    {
                                                        color: colors
                                                            .greenAccent[500],
                                                    },
                                                "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track":
                                                    {
                                                        backgroundColor:
                                                            colors
                                                                .greenAccent[500],
                                                    },
                                            }}
                                        />
                                    }
                                    label="Entity detection"
                                />

                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={options.sentiment_analysis}
                                            onChange={(e) =>
                                                setOptions((o) => ({
                                                    ...o,
                                                    sentiment_analysis:
                                                        e.target.checked,
                                                }))
                                            }
                                            sx={{
                                                "& .MuiSwitch-switchBase.Mui-checked":
                                                    {
                                                        color: colors
                                                            .greenAccent[500],
                                                    },
                                                "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track":
                                                    {
                                                        backgroundColor:
                                                            colors
                                                                .greenAccent[500],
                                                    },
                                            }}
                                        />
                                    }
                                    label="Sentiment analysis"
                                />
                            </AccordionDetails>
                        </Accordion>
                    </Box>

                    {/* Sticky-ish primary action */}
                    <Box sx={{ mt: "auto", pt: 1 }}>
                        <Button
                            variant="contained"
                            onClick={handleUpload}
                            disabled={!file || loading}
                            fullWidth
                            sx={{ py: 1.2 }}
                        >
                            {loading ? "Transcribing…" : "Upload & Transcribe"}
                        </Button>
                    </Box>
                </Paper>

                {/* Right panel */}
                <Paper
                    sx={{
                        p: 3,
                        width: "100%",
                        flex: { md: "1.2 1 0" },
                        minWidth: 0,
                        borderRadius: 3,
                        border: `1px solid ${theme.palette.divider}`,
                        display: "flex",
                        flexDirection: "column",
                        minHeight: { md: "calc(100vh - 180px)" },
                        transition: "box-shadow 150ms ease",
                        "&:hover": { boxShadow: 2 },
                    }}
                >
                    <Box
                        sx={{
                            display: "flex",
                            alignItems: "flex-start",
                            justifyContent: "space-between",
                            gap: 2,
                            mb: 2,
                        }}
                    >
                        <Box>
                            <Typography variant="h6" sx={{ fontWeight: 700 }}>
                                Result
                            </Typography>
                            <Typography
                                variant="body2"
                                sx={{ color: "text.secondary", mt: 0.5 }}
                                aria-live="polite"
                            >
                                {rightPanelSubtitle}
                            </Typography>
                        </Box>

                        <Box
                            sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 1,
                            }}
                        >
                            {results && (
                                <>
                                    <ExportButton
                                        transcriptId={results.id}
                                        fileName={results.file_name}
                                    />
                                    <DeleteButton
                                        label="Delete"
                                        onDelete={async ({
                                            deleteFromAssembly,
                                            deleteServerFiles,
                                        }) => {
                                            const msg =
                                                await deleteTranscription(
                                                    results.id,
                                                    {
                                                        deleteFromAssembly,
                                                        deleteTxtFile:
                                                            deleteServerFiles,
                                                        deleteAudioFile:
                                                            deleteServerFiles,
                                                    },
                                                );
                                            setResults(null);
                                            return msg;
                                        }}
                                    />
                                </>
                            )}

                            {!results && !loading && (
                                <Tooltip title="Results appear here after transcription">
                                    <IconButton size="small">
                                        <DescriptionOutlinedIcon fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                            )}
                        </Box>
                    </Box>

                    {results && (
                        <Box
                            sx={{
                                display: "flex",
                                flexWrap: "wrap",
                                gap: 1,
                                mb: 2,
                            }}
                        >
                            <Chip
                                size="small"
                                label={`Model: ${results.options?.speech_models?.[0]}`}
                                variant="outlined"
                            />
                            <Chip
                                size="small"
                                label={`Language: ${getLanguageLabel(options.language_code)}`}
                                variant="outlined"
                            />
                            {options.speaker_labels && (
                                <Chip
                                    size="small"
                                    label={`Speakers: ${options.speakers_expected}`}
                                    variant="outlined"
                                />
                            )}
                            {options.sentiment_analysis && (
                                <Chip
                                    size="small"
                                    label="Sentiment"
                                    variant="outlined"
                                />
                            )}
                            {options.entity_detection && (
                                <Chip
                                    size="small"
                                    label="Entities"
                                    variant="outlined"
                                />
                            )}
                        </Box>
                    )}

                    <Box
                        sx={{
                            flex: 1,
                            minHeight: 0,
                            transition: "opacity 180ms ease",
                            opacity: results ? 1 : 0.98,
                        }}
                    >
                        {!results && !loading && (
                            <Box
                                sx={{
                                    border: `1px dashed ${theme.palette.divider}`,
                                    borderRadius: 2,
                                    p: 3,
                                    textAlign: "center",
                                    height: "100%",
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    gap: 1,
                                }}
                            >
                                <DescriptionOutlinedIcon
                                    sx={{ fontSize: 52, opacity: 0.35 }}
                                />
                                <Typography sx={{ fontWeight: 700 }}>
                                    No transcript yet
                                </Typography>
                                <Typography
                                    variant="body2"
                                    sx={{
                                        color: "text.secondary",
                                        maxWidth: 420,
                                    }}
                                >
                                    Choose a file on the left and start the
                                    transcription. When it completes, the
                                    transcript will show up here.
                                </Typography>
                            </Box>
                        )}

                        {!results && loading && (
                            <Box sx={{ mt: 1 }}>
                                <LinearProgress
                                    sx={{
                                        "& .MuiLinearProgress-bar": {
                                            backgroundColor:
                                                colors.greenAccent[500],
                                        },
                                    }}
                                />
                                <Typography
                                    variant="body2"
                                    sx={{ color: "text.secondary", mt: 1 }}
                                    aria-live="polite"
                                >
                                    Processing: {currentStepLabel}
                                </Typography>
                            </Box>
                        )}

                        {results && (
                            <Box
                                sx={{
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: 1.5,
                                    animation: "fadeIn 180ms ease",
                                    "@keyframes fadeIn": {
                                        from: {
                                            opacity: 0.6,
                                            transform: "translateY(2px)",
                                        },
                                        to: {
                                            opacity: 1,
                                            transform: "translateY(0)",
                                        },
                                    },
                                }}
                            >
                                <Box
                                    sx={{
                                        display: "flex",
                                        alignItems: "baseline",
                                        justifyContent: "space-between",
                                        gap: 2,
                                        flexWrap: "wrap",
                                    }}
                                >
                                    <Box>
                                        <Typography
                                            variant="subtitle1"
                                            sx={{ fontWeight: 700 }}
                                        >
                                            {results.file_name}
                                        </Typography>
                                        <Typography
                                            variant="body2"
                                            sx={{ color: "text.secondary" }}
                                        >
                                            Recorded at:{" "}
                                            {formatDateTime(
                                                results.file_recorded_at,
                                            )}
                                        </Typography>
                                    </Box>
                                </Box>

                                <TranscriptText
                                    text={results.transcription}
                                    utterances={results.utterances}
                                    maxHeight={transcriptMaxHeight}
                                />
                            </Box>
                        )}
                    </Box>
                </Paper>
            </Box>
        </Box>
    );
};
