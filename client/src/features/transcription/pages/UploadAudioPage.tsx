// src/features/transcription/pages/UploadAudioPage.tsx

import { useState, useRef, useEffect, useMemo } from "react";
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Alert,
    Box,
    Button,
    Chip,
    Divider,
    FormControl,
    FormControlLabel,
    IconButton,
    InputLabel,
    LinearProgress,
    MenuItem,
    Paper,
    Radio,
    RadioGroup,
    Select,
    Step,
    StepLabel,
    Stepper,
    Switch,
    TextField,
    Tooltip,
    Typography,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import UploadFileOutlinedIcon from "@mui/icons-material/UploadFileOutlined";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import { useTheme } from "@mui/material/styles";
import { tokens } from "../../../theme/theme";

import {
    deleteTranscription,
    getTranscriptionProgressUrl,
    startTranscriptionJob,
} from "../../auth/api";

import { usePreferencesStore } from "../../../store/usePreferencesStore";
import { mapPreferencesToUploadOptions } from "../../preferences/utils/mapPreferencesToUploadOptions";

import { DeleteButton } from "../components/DeleteButton";
import { ExportButton } from "../components/ExportButton";

import type {
    CompletedEventPayload,
    ErrorEventPayload,
    SpeakerType,
    SpeechModel,
    StepEventPayload,
    TranscriptData,
    TranscriptionOptions,
    TranscriptionStepKey,
    TranscriptionStepsState,
} from "../../../types/types";

import { formatDateTime } from "../../../utils/formatDate";
import { TranscriptText } from "../components/TranscriptText";

const TRANSCRIPTION_STEP_ORDER: TranscriptionStepKey[] = [
    "init",
    "upload",
    "transcribe",
    "save_db",
    "save_file",
    "complete",
];

const AUTO_LANGUAGE_CODE = "auto";
const DISABLED_U3_FORMATTING_TEXT =
    "This feature is not configurable for universal-3-pro.";

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
    disfluencies: false,
    speech_models: ["universal-3-pro", "universal-2"],
    language_code: "en",
    language_detection: true,
};

const modelLanguages: Record<SpeechModel, string[]> = {
    "universal-3-pro": ["en", "es", "de", "fr", "pt", "it"],
    "universal-2": [
        "en",
        "en_uk",
        "en_us",
        "en_au",
        "de",
        "fa",
        "es",
        "fr",
        "it",
        "pt",
        "nl",
        "hi",
        "ja",
        "zh",
        "ko",
        "ru",
        "tr",
        "uk",
        "vi",
        "ar",
    ],
};

const speechModelHelp: Record<SpeechModel, string> = {
    "universal-3-pro":
        "Highest-accuracy option for supported languages. Supports prompts, automatic language detection, and internal fallback to universal-2.",
    "universal-2":
        "Broad language-coverage option. Best when you need wide language support, lower cost, or a fallback for languages outside universal-3-pro.",
};

const languageLabels: Record<string, string> = {
    [AUTO_LANGUAGE_CODE]: "Automatic language detection",
    en: "English (Global)",
    en_au: "English (Australian)",
    en_uk: "English (British)",
    en_us: "English (US)",
    de: "German",
    fa: "Persian (Farsi)",
    es: "Spanish",
    fr: "French",
    it: "Italian",
    pt: "Portuguese",
    nl: "Dutch",
    hi: "Hindi",
    ja: "Japanese",
    zh: "Chinese",
    ko: "Korean",
    ru: "Russian",
    tr: "Turkish",
    uk: "Ukrainian",
    vi: "Vietnamese",
    ar: "Arabic",
};

type PromptPresetKey =
    | "default"
    | "verbatim_multilingual"
    | "unclear_audio"
    | "custom";

const PROMPT_PRESETS: Record<
    Exclude<PromptPresetKey, "custom">,
    {
        label: string;
        helper: string;
        value: string;
    }
> = {
    default: {
        label: "Use AssemblyAI default (recommended)",
        helper: "Start here, then only add a prompt if you need extra control.",
        value: "",
    },
    verbatim_multilingual: {
        label: "Verbatim + multilingual",
        helper: "Keeps mixed-language speech, filler words, hesitations, and false starts.",
        value: "Preserve the original language mix as spoken. Keep filler words, hesitations, repetitions, stutters, and false starts.",
    },
    unclear_audio: {
        label: "Reduce hallucinations on unclear audio",
        helper: "Prefer marking uncertain audio instead of guessing.",
        value: "Transcribe exactly as heard. If audio is unclear, mark it as [unclear]. Review for hallucinations, spelling mistakes, and unnatural wording.",
    },
};

const getLanguageLabel = (code: string): string => languageLabels[code] ?? code;

const getVisibleSpeechModel = (speechModels?: SpeechModel[]): SpeechModel => {
    if (speechModels?.[0] === "universal-3-pro") {
        return "universal-3-pro";
    }

    return "universal-2";
};

const buildSpeechModels = (model: SpeechModel): SpeechModel[] => {
    if (model === "universal-3-pro") {
        return ["universal-3-pro", "universal-2"];
    }

    return ["universal-2"];
};

const normalizeKnownSpeakerInputs = (
    values: string[] | undefined,
    count: number,
): string[] => {
    const safeCount = Math.max(1, count);
    const current = Array.isArray(values) ? [...values] : [];

    if (current.length > safeCount) {
        return current.slice(0, safeCount);
    }

    while (current.length < safeCount) {
        current.push("");
    }

    return current;
};

const sanitizeKnownSpeakers = (
    values: string[] | undefined,
): string[] | undefined => {
    const cleaned = (values ?? []).map((value) => value.trim()).filter(Boolean);

    return cleaned.length > 0 ? cleaned : undefined;
};

const getPromptPresetKey = (prompt?: string): PromptPresetKey => {
    const trimmed = (prompt ?? "").trim();

    if (!trimmed) return "default";

    if (trimmed === PROMPT_PRESETS.verbatim_multilingual.value) {
        return "verbatim_multilingual";
    }

    if (trimmed === PROMPT_PRESETS.unclear_audio.value) {
        return "unclear_audio";
    }

    return "custom";
};

const TOOLTIP_SX = {
    fontSize: "0.95rem",
    lineHeight: 1.5,
    maxWidth: 360,
    px: 1.5,
    py: 1.25,
} as const;

const InfoLabel = ({ label, tooltip }: { label: string; tooltip?: string }) => (
    <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.5 }}>
        <Typography variant="body2">{label}</Typography>

        {tooltip ? (
            <Tooltip
                title={tooltip}
                arrow
                slotProps={{
                    tooltip: {
                        sx: TOOLTIP_SX,
                    },
                }}
            >
                <IconButton
                    size="small"
                    sx={{
                        p: 0.25,
                        color: "text.secondary",
                    }}
                >
                    <InfoOutlinedIcon fontSize="inherit" />
                </IconButton>
            </Tooltip>
        ) : null}
    </Box>
);

export const UploadAudioPage = () => {
    const theme = useTheme();
    const colors = tokens(theme.palette.mode);

    const {
        preferences,
        load: loadPreferences,
        loading: preferencesLoading,
    } = usePreferencesStore();

    const [file, setFile] = useState<File | null>(null);
    const [hasLocalOptionEdits, setHasLocalOptionEdits] = useState(false);
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

    const [speakerSectionOpen, setSpeakerSectionOpen] = useState(true);
    const [formatSectionOpen, setFormatSectionOpen] = useState(false);
    const [selectedPromptPreset, setSelectedPromptPreset] =
        useState<PromptPresetKey>("default");

    const eventSourceRef = useRef<EventSource | null>(null);

    useEffect(() => {
        if (!preferences && !preferencesLoading) {
            void loadPreferences();
        }
    }, [preferences, preferencesLoading, loadPreferences]);

    useEffect(() => {
        if (!preferences || hasLocalOptionEdits) return;

        setOptions((current) => {
            const mapped = mapPreferencesToUploadOptions(preferences);

            return {
                ...current,
                ...mapped,
                speakers_expected: Math.max(1, mapped.speakers_expected ?? 2),
                prompt: mapped.prompt ?? "",
                format_text:
                    mapped.format_text === undefined
                        ? current.format_text
                        : mapped.format_text,
                punctuate:
                    mapped.punctuate === undefined
                        ? current.punctuate
                        : mapped.punctuate,
                disfluencies:
                    mapped.disfluencies === undefined
                        ? current.disfluencies
                        : mapped.disfluencies,
            };
        });
    }, [preferences, hasLocalOptionEdits]);

    useEffect(() => {
        return () => {
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
            }
        };
    }, []);

    const transcriptMaxHeight = useMemo(
        () => "min(820px, calc(100vh - 360px))",
        [],
    );

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

    const currentSpeechModel: SpeechModel = getVisibleSpeechModel(
        options.speech_models,
    );

    const currentModelLanguages = useMemo(() => {
        const langs = modelLanguages[currentSpeechModel] ?? [];
        return langs.length ? langs : ["en"];
    }, [currentSpeechModel]);

    const isUniversal3Pro = currentSpeechModel === "universal-3-pro";

    const autoLanguageEnabled =
        options.language_code === AUTO_LANGUAGE_CODE ||
        Boolean(options.language_detection);

    const codeSwitchingEnabled = Boolean(
        options.language_detection_options?.code_switching,
    );

    const speakerIdentificationEnabled = Boolean(
        options.speaker_identification?.enabled,
    );

    const diarizationEnabled = Boolean(options.speaker_labels);

    const currentSpeakerType: SpeakerType =
        options.speaker_identification?.speaker_type ?? "name";

    const knownSpeakerInputs = normalizeKnownSpeakerInputs(
        options.speaker_identification?.speakers,
        options.speakers_expected ?? 1,
    );

    const knownValuePlaceholder =
        currentSpeakerType === "role" ? "e.g. Host" : "e.g. Maya";

    useEffect(() => {
        setSelectedPromptPreset(
            isUniversal3Pro ? getPromptPresetKey(options.prompt) : "default",
        );
    }, [isUniversal3Pro, options.prompt]);

    useEffect(() => {
        if (!speakerIdentificationEnabled) return;

        setOptions((prev) => {
            const nextValues = normalizeKnownSpeakerInputs(
                prev.speaker_identification?.speakers,
                prev.speakers_expected ?? 1,
            );

            const currentValues = prev.speaker_identification?.speakers ?? [];
            const hasChanged =
                nextValues.length !== currentValues.length ||
                nextValues.some(
                    (value, index) => value !== currentValues[index],
                );

            if (!hasChanged) {
                return prev;
            }

            return {
                ...prev,
                speaker_identification: {
                    enabled: true,
                    speaker_type:
                        prev.speaker_identification?.speaker_type ?? "name",
                    speakers: nextValues,
                },
            };
        });
    }, [speakerIdentificationEnabled, options.speakers_expected]);

    useEffect(() => {
        if (!speakerIdentificationEnabled) return;

        setOptions((prev) => {
            const nextValues = normalizeKnownSpeakerInputs(
                prev.speaker_identification?.speakers,
                prev.speakers_expected ?? 1,
            );

            const currentValues = prev.speaker_identification?.speakers ?? [];
            const hasChanged =
                nextValues.length !== currentValues.length ||
                nextValues.some(
                    (value, index) => value !== currentValues[index],
                );

            if (!hasChanged) {
                return prev;
            }

            return {
                ...prev,
                speaker_identification: {
                    enabled: true,
                    speaker_type:
                        prev.speaker_identification?.speaker_type ?? "name",
                    speakers: nextValues,
                },
            };
        });
    }, [speakerIdentificationEnabled, options.speakers_expected]);

    useEffect(() => {
        setOptions((prev) => {
            const selectedModel = getVisibleSpeechModel(prev.speech_models);

            if (selectedModel !== "universal-3-pro") {
                return prev;
            }

            if (
                prev.language_code === AUTO_LANGUAGE_CODE ||
                prev.language_detection
            ) {
                return prev;
            }

            return {
                ...prev,
                language_code: AUTO_LANGUAGE_CODE,
                language_detection: true,
            };
        });
    }, [currentSpeechModel]);

    useEffect(() => {
        setOptions((prev) => {
            if (!autoLanguageEnabled && prev.language_detection_options) {
                return {
                    ...prev,
                    language_detection_options: undefined,
                };
            }

            return prev;
        });
    }, [autoLanguageEnabled]);

    useEffect(() => {
        setOptions((prev) => {
            if (autoLanguageEnabled) return prev;

            if (currentModelLanguages.includes(prev.language_code)) return prev;

            return {
                ...prev,
                language_code: currentModelLanguages[0] ?? "en",
            };
        });
    }, [autoLanguageEnabled, currentModelLanguages]);

    const handleSelectModel = (model: SpeechModel): void => {
        setHasLocalOptionEdits(true);

        setOptions((prev) => {
            const nextLanguages = modelLanguages[model] ?? ["en"];
            const prevKnownValues = prev.speaker_identification?.speakers;

            const nextLanguageCode =
                prev.language_code === AUTO_LANGUAGE_CODE ||
                prev.language_detection
                    ? AUTO_LANGUAGE_CODE
                    : nextLanguages.includes(prev.language_code)
                      ? prev.language_code
                      : (nextLanguages[0] ?? "en");

            return {
                ...prev,
                speech_models: buildSpeechModels(model),
                language_code: nextLanguageCode,
                language_detection:
                    nextLanguageCode === AUTO_LANGUAGE_CODE ? true : undefined,
                language_detection_options: autoLanguageEnabled
                    ? prev.language_detection_options
                    : undefined,
                prompt: model === "universal-2" ? "" : (prev.prompt ?? ""),
                speaker_identification: prev.speaker_identification?.enabled
                    ? {
                          enabled: true,
                          speaker_type:
                              prev.speaker_identification?.speaker_type ??
                              "name",
                          speakers: normalizeKnownSpeakerInputs(
                              prevKnownValues,
                              prev.speakers_expected ?? 1,
                          ),
                      }
                    : undefined,
            };
        });
    };

    const handleLanguageChange = (nextValue: string): void => {
        setHasLocalOptionEdits(true);

        setOptions((prev) => {
            const selectingAuto = nextValue === AUTO_LANGUAGE_CODE;

            return {
                ...prev,
                language_code: selectingAuto ? AUTO_LANGUAGE_CODE : nextValue,
                language_detection: selectingAuto ? true : undefined,
                language_detection_options: selectingAuto
                    ? prev.language_detection_options
                    : undefined,
            };
        });
    };

    const handleCodeSwitchingToggle = (enabled: boolean): void => {
        setHasLocalOptionEdits(true);

        setOptions((prev) => ({
            ...prev,
            language_code: enabled ? AUTO_LANGUAGE_CODE : prev.language_code,
            language_detection:
                enabled || prev.language_code === AUTO_LANGUAGE_CODE
                    ? true
                    : undefined,
            language_detection_options: enabled
                ? { code_switching: true }
                : undefined,
        }));
    };

    const handleSpeakerLabelsToggle = (enabled: boolean): void => {
        setHasLocalOptionEdits(true);

        setOptions((prev) => ({
            ...prev,
            speaker_labels: enabled,
            speakers_expected: Math.max(1, prev.speakers_expected ?? 1),
            speaker_identification: enabled
                ? undefined
                : prev.speaker_identification,
        }));
    };

    const handleSpeakersExpectedChange = (rawValue: string): void => {
        const nextCount = Math.max(1, Number.parseInt(rawValue, 10) || 1);

        setHasLocalOptionEdits(true);

        setOptions((prev) => ({
            ...prev,
            speakers_expected: nextCount,
            speaker_identification: prev.speaker_identification?.enabled
                ? {
                      enabled: true,
                      speaker_type:
                          prev.speaker_identification.speaker_type ?? "name",
                      speakers: normalizeKnownSpeakerInputs(
                          prev.speaker_identification.speakers,
                          nextCount,
                      ),
                  }
                : prev.speaker_identification,
        }));
    };

    const handleSpeakerIdentificationToggle = (enabled: boolean): void => {
        setHasLocalOptionEdits(true);

        setOptions((prev) => ({
            ...prev,
            speaker_labels: enabled ? false : prev.speaker_labels,
            speaker_identification: enabled
                ? {
                      enabled: true,
                      speaker_type:
                          prev.speaker_identification?.speaker_type ?? "name",
                      speakers: normalizeKnownSpeakerInputs(
                          prev.speaker_identification?.speakers,
                          prev.speakers_expected ?? 1,
                      ),
                  }
                : undefined,
        }));
    };

    const handleSpeakerTypeChange = (speakerType: SpeakerType): void => {
        setHasLocalOptionEdits(true);

        setOptions((prev) => ({
            ...prev,
            speaker_identification: {
                enabled: true,
                speaker_type: speakerType,
                speakers: normalizeKnownSpeakerInputs(
                    prev.speaker_identification?.speakers,
                    prev.speakers_expected ?? 1,
                ),
            },
        }));
    };

    const handleKnownSpeakerChange = (index: number, value: string): void => {
        setHasLocalOptionEdits(true);

        setOptions((prev) => {
            const nextValues = normalizeKnownSpeakerInputs(
                prev.speaker_identification?.speakers,
                prev.speakers_expected ?? 1,
            );

            nextValues[index] = value;

            return {
                ...prev,
                speaker_identification: {
                    enabled: true,
                    speaker_type:
                        prev.speaker_identification?.speaker_type ?? "name",
                    speakers: nextValues,
                },
            };
        });
    };

    const handleAddKnownValueField = (): void => {
        setHasLocalOptionEdits(true);

        setOptions((prev) => {
            const nextCount = Math.max(1, (prev.speakers_expected ?? 1) + 1);

            return {
                ...prev,
                speakers_expected: nextCount,
                speaker_identification: {
                    enabled: true,
                    speaker_type:
                        prev.speaker_identification?.speaker_type ?? "name",
                    speakers: normalizeKnownSpeakerInputs(
                        prev.speaker_identification?.speakers,
                        nextCount,
                    ),
                },
            };
        });
    };

    const handlePromptPresetChange = (presetKey: PromptPresetKey): void => {
        setHasLocalOptionEdits(true);
        setSelectedPromptPreset(presetKey);

        if (presetKey === "custom") return;

        setOptions((prev) => ({
            ...prev,
            prompt: PROMPT_PRESETS[presetKey].value,
        }));
    };

    const handlePromptInputChange = (value: string): void => {
        setHasLocalOptionEdits(true);
        setOptions((prev) => ({
            ...prev,
            prompt: value,
        }));
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

        const userOptions: Partial<TranscriptionOptions> = {
            speech_models: buildSpeechModels(currentSpeechModel),
        };

        if (autoLanguageEnabled) {
            userOptions.language_detection = true;

            if (codeSwitchingEnabled) {
                userOptions.language_detection_options = {
                    code_switching: true,
                };
            }
        } else {
            userOptions.language_code = options.language_code;
        }

        if (currentSpeechModel === "universal-3-pro") {
            const trimmedPrompt = options.prompt?.trim();
            if (trimmedPrompt) {
                userOptions.prompt = trimmedPrompt;
            }
        }

        if (options.speaker_identification?.enabled) {
            userOptions.speaker_identification = {
                enabled: true,
                speaker_type: options.speaker_identification.speaker_type,
                speakers: sanitizeKnownSpeakers(
                    options.speaker_identification.speakers,
                ),
            };
        } else if (options.speaker_labels) {
            userOptions.speaker_labels = true;
            userOptions.speakers_expected = Math.max(
                1,
                options.speakers_expected ?? 1,
            );
        }

        if (currentSpeechModel === "universal-2") {
            if (options.punctuate) userOptions.punctuate = true;
            if (options.format_text) userOptions.format_text = true;
            if (options.disfluencies) userOptions.disfluencies = true;
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
                            payload.message ||
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
                                sx: TOOLTIP_SX,
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
                            }}
                        >
                            <InfoOutlinedIcon fontSize="inherit" />
                        </IconButton>
                    </Tooltip>
                </Box>
            </Button>
        );
    };

    const renderFormattingSwitch = ({
        checked,
        label,
        tooltip,
        onChange,
    }: {
        checked: boolean;
        label: string;
        tooltip: string;
        onChange: (checked: boolean) => void;
    }) => {
        const disabled = isUniversal3Pro;
        const effectiveTooltip = disabled
            ? DISABLED_U3_FORMATTING_TEXT
            : tooltip;

        return (
            <FormControlLabel
                sx={{
                    ml: 0,
                    mr: 0,
                    py: 0.25,
                    alignItems: "center",
                    "& .MuiFormControlLabel-label": {
                        display: "flex",
                        alignItems: "center",
                    },
                }}
                control={
                    <Switch
                        checked={checked}
                        disabled={disabled}
                        onChange={(e) => {
                            setHasLocalOptionEdits(true);
                            onChange(e.target.checked);
                        }}
                        sx={{
                            mr: 1,
                            "& .MuiSwitch-switchBase.Mui-checked": {
                                color: colors.greenAccent[500],
                            },
                            "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track":
                                {
                                    backgroundColor: colors.greenAccent[500],
                                },
                        }}
                    />
                }
                label={<InfoLabel label={label} tooltip={effectiveTooltip} />}
            />
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

                    <Button
                        variant="outlined"
                        component="label"
                        startIcon={<UploadFileOutlinedIcon />}
                        fullWidth
                        sx={{
                            color: colors.grey[100],
                            borderColor: colors.grey[300],
                            "&:hover": {
                                borderColor: colors.grey[200],
                                backgroundColor: theme.palette.action.hover,
                            },
                        }}
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
                            Speech model
                        </Typography>

                        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                            {renderModelButton("universal-3-pro")}
                            {renderModelButton("universal-2")}
                        </Box>
                    </Box>

                    <Divider sx={{ borderColor: theme.palette.divider }} />

                    <Box
                        sx={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 1.25,
                        }}
                    >
                        <InfoLabel
                            label="Language"
                            tooltip="Choose a language manually, or use automatic language detection to let AssemblyAI choose the best supported model for the audio."
                        />

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
                            <InputLabel id="language-label">
                                Language
                            </InputLabel>
                            <Select
                                labelId="language-label"
                                label="Language"
                                value={
                                    autoLanguageEnabled
                                        ? AUTO_LANGUAGE_CODE
                                        : options.language_code
                                }
                                onChange={(e) =>
                                    handleLanguageChange(String(e.target.value))
                                }
                            >
                                <MenuItem value={AUTO_LANGUAGE_CODE}>
                                    {getLanguageLabel(AUTO_LANGUAGE_CODE)}
                                </MenuItem>

                                {currentModelLanguages.map((lang) => (
                                    <MenuItem key={lang} value={lang}>
                                        {getLanguageLabel(lang)}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <FormControlLabel
                            sx={{ ml: 0 }}
                            control={
                                <Switch
                                    checked={codeSwitchingEnabled}
                                    disabled={!autoLanguageEnabled}
                                    onChange={(e) =>
                                        handleCodeSwitchingToggle(
                                            e.target.checked,
                                        )
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
                            label={
                                <InfoLabel
                                    label="Code switching"
                                    tooltip="Use this when speakers switch between languages in the same recording. It works with automatic language detection and helps preserve mixed-language speech."
                                />
                            }
                        />
                    </Box>

                    {isUniversal3Pro && (
                        <>
                            <Divider
                                sx={{ borderColor: theme.palette.divider }}
                            />

                            <Box
                                sx={{
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: 1.25,
                                }}
                            >
                                <InfoLabel
                                    label="Prompt"
                                    tooltip="For best results, start without a prompt first. When you need more control, pick a recommended prompt and then edit it to fit your audio."
                                />

                                <FormControl component="fieldset">
                                    <RadioGroup
                                        value={selectedPromptPreset}
                                        onChange={(e) =>
                                            handlePromptPresetChange(
                                                e.target
                                                    .value as PromptPresetKey,
                                            )
                                        }
                                    >
                                        {(
                                            Object.entries(
                                                PROMPT_PRESETS,
                                            ) as Array<
                                                [
                                                    Exclude<
                                                        PromptPresetKey,
                                                        "custom"
                                                    >,
                                                    (typeof PROMPT_PRESETS)[Exclude<
                                                        PromptPresetKey,
                                                        "custom"
                                                    >],
                                                ]
                                            >
                                        ).map(([key, preset]) => (
                                            <Box
                                                key={key}
                                                sx={{
                                                    border: `1px solid ${theme.palette.divider}`,
                                                    borderRadius: 2,
                                                    px: 1.25,
                                                    py: 0.9,
                                                    mb: 1,
                                                }}
                                            >
                                                <FormControlLabel
                                                    value={key}
                                                    control={<Radio />}
                                                    label={
                                                        <Box>
                                                            <Typography
                                                                variant="body2"
                                                                sx={{
                                                                    fontWeight: 600,
                                                                }}
                                                            >
                                                                {preset.label}
                                                            </Typography>
                                                            <Typography
                                                                variant="caption"
                                                                color="text.secondary"
                                                            >
                                                                {preset.helper}
                                                            </Typography>
                                                        </Box>
                                                    }
                                                />
                                            </Box>
                                        ))}

                                        <FormControlLabel
                                            value="custom"
                                            control={<Radio />}
                                            label="Custom prompt"
                                        />
                                    </RadioGroup>
                                </FormControl>

                                <TextField
                                    label="Prompt input"
                                    value={options.prompt ?? ""}
                                    onChange={(e) =>
                                        handlePromptInputChange(e.target.value)
                                    }
                                    size="small"
                                    multiline
                                    minRows={4}
                                    placeholder="e.g. Preserve mixed-language speech, keep filler words, and do not normalize false starts."
                                    helperText="You can pick a recommended prompt, then edit it here."
                                />
                            </Box>
                        </>
                    )}

                    <Divider sx={{ borderColor: theme.palette.divider }} />

                    <Accordion
                        disableGutters
                        elevation={0}
                        expanded={speakerSectionOpen}
                        onChange={() => setSpeakerSectionOpen((prev) => !prev)}
                        sx={{
                            borderRadius: 2,
                            border: `1px solid ${theme.palette.divider}`,
                            backgroundColor: "transparent",
                            "&:before": { display: "none" },
                            "&.Mui-expanded": { margin: 0 },
                        }}
                    >
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <Typography variant="subtitle2">
                                Speaker Handling
                            </Typography>
                        </AccordionSummary>

                        <AccordionDetails
                            sx={{
                                display: "flex",
                                flexDirection: "column",
                                gap: 1.25,
                            }}
                        >
                            <Box
                                sx={{
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: 1,
                                }}
                            >
                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={diarizationEnabled}
                                            onChange={(e) =>
                                                handleSpeakerLabelsToggle(
                                                    e.target.checked,
                                                )
                                            }
                                        />
                                    }
                                    label={
                                        <InfoLabel
                                            label="Speaker diarization"
                                            tooltip="Separates the transcript into speaker turns."
                                        />
                                    }
                                />

                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={
                                                speakerIdentificationEnabled
                                            }
                                            onChange={(e) =>
                                                handleSpeakerIdentificationToggle(
                                                    e.target.checked,
                                                )
                                            }
                                        />
                                    }
                                    label={
                                        <InfoLabel
                                            label="Speaker identification"
                                            tooltip="Guide transcription with known speaker names or roles."
                                        />
                                    }
                                />
                            </Box>
                            <TextField
                                label="Speakers expected"
                                type="number"
                                value={options.speakers_expected ?? 1}
                                onChange={(e) =>
                                    handleSpeakersExpectedChange(e.target.value)
                                }
                                slotProps={{
                                    htmlInput: { min: 1, max: 20 },
                                }}
                                size="small"
                                disabled={
                                    !diarizationEnabled &&
                                    !speakerIdentificationEnabled
                                }
                                helperText={
                                    speakerIdentificationEnabled
                                        ? "Controls how many known speaker inputs are shown."
                                        : diarizationEnabled
                                          ? "Used to improve diarization."
                                          : "Used for diarization or to size known speaker inputs for identification."
                                }
                            />

                            {speakerIdentificationEnabled && (
                                <>
                                    <FormControl size="small" fullWidth>
                                        <InputLabel id="speaker-type-label">
                                            Speaker type
                                        </InputLabel>
                                        <Select
                                            labelId="speaker-type-label"
                                            label="Speaker type"
                                            value={currentSpeakerType}
                                            onChange={(e) =>
                                                handleSpeakerTypeChange(
                                                    e.target
                                                        .value as SpeakerType,
                                                )
                                            }
                                        >
                                            <MenuItem value="name">
                                                Name
                                            </MenuItem>
                                            <MenuItem value="role">
                                                Role
                                            </MenuItem>
                                        </Select>
                                    </FormControl>

                                    <Box
                                        sx={{
                                            display: "flex",
                                            flexDirection: "column",
                                            gap: 1,
                                        }}
                                    >
                                        <InfoLabel
                                            label="Known values (optional)"
                                            tooltip="Add names or roles you expect in the recording."
                                        />

                                        {knownSpeakerInputs.map(
                                            (value, index) => (
                                                <TextField
                                                    key={index}
                                                    size="small"
                                                    label={`Known value ${index + 1}`}
                                                    value={value}
                                                    placeholder={
                                                        knownValuePlaceholder
                                                    }
                                                    onChange={(e) =>
                                                        handleKnownSpeakerChange(
                                                            index,
                                                            e.target.value,
                                                        )
                                                    }
                                                />
                                            ),
                                        )}

                                        <Button
                                            variant="text"
                                            startIcon={<AddCircleOutlineIcon />}
                                            onClick={handleAddKnownValueField}
                                            sx={{
                                                justifyContent: "flex-start",
                                                width: "fit-content",
                                                textTransform: "none",
                                                px: 0,
                                            }}
                                        >
                                            Add another known value
                                        </Button>
                                    </Box>
                                </>
                            )}
                        </AccordionDetails>
                    </Accordion>

                    <Accordion
                        disableGutters
                        elevation={0}
                        expanded={formatSectionOpen}
                        onChange={() => setFormatSectionOpen((prev) => !prev)}
                        sx={{
                            borderRadius: 2,
                            border: `1px solid ${theme.palette.divider}`,
                            backgroundColor: "transparent",
                            "&:before": { display: "none" },
                            "&.Mui-expanded": { margin: 0 },
                        }}
                    >
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <Typography variant="subtitle2">
                                Format Transcript
                            </Typography>
                        </AccordionSummary>

                        <AccordionDetails
                            sx={{
                                display: "flex",
                                flexDirection: "column",
                                gap: 0.25,
                            }}
                        >
                            {renderFormattingSwitch({
                                checked: Boolean(options.punctuate),
                                label: "Auto Punctuation",
                                tooltip:
                                    "Adds punctuation automatically to improve readability.",
                                onChange: (checked) =>
                                    setOptions((prev) => ({
                                        ...prev,
                                        punctuate: checked,
                                    })),
                            })}

                            {renderFormattingSwitch({
                                checked: Boolean(options.format_text),
                                label: "Text Formatting",
                                tooltip:
                                    "Applies transcript formatting for cleaner readable output.",
                                onChange: (checked) =>
                                    setOptions((prev) => ({
                                        ...prev,
                                        format_text: checked,
                                    })),
                            })}

                            {renderFormattingSwitch({
                                checked: Boolean(options.disfluencies),
                                label: "Filler Words",
                                tooltip:
                                    "Keeps words like um, uh, hesitations, and false starts.",
                                onChange: (checked) =>
                                    setOptions((prev) => ({
                                        ...prev,
                                        disfluencies: checked,
                                    })),
                            })}
                        </AccordionDetails>
                    </Accordion>

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
                                label={`Model: ${results.options?.speech_models?.[0] ?? currentSpeechModel}`}
                                variant="outlined"
                            />
                            <Chip
                                size="small"
                                label={`Language: ${
                                    autoLanguageEnabled
                                        ? "Automatic detection"
                                        : getLanguageLabel(
                                              options.language_code,
                                          )
                                }`}
                                variant="outlined"
                            />
                            {options.speaker_labels && (
                                <Chip
                                    size="small"
                                    label={`Speakers: ${options.speakers_expected}`}
                                    variant="outlined"
                                />
                            )}
                            {speakerIdentificationEnabled && (
                                <Chip
                                    size="small"
                                    label={`Speaker ID: ${currentSpeakerType}`}
                                    variant="outlined"
                                />
                            )}
                            {currentSpeechModel === "universal-2" &&
                                options.disfluencies && (
                                    <Chip
                                        size="small"
                                        label="Filler Words"
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
