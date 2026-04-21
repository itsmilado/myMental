// src/features/transcription/pages/UploadAudioPage.tsx

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
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
    FormHelperText,
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
    fetchMyAssemblyConnections,
    getTranscriptionProgressUrl,
    startTranscriptionJob,
} from "../../auth/api";

import { usePreferencesStore } from "../../../store/usePreferencesStore";
import { mapPreferencesToUploadOptions } from "../../preferences/utils/mapPreferencesToUploadOptions";

import { useTranscriptPlaybackSync } from "../hooks/useTranscriptPlaybackSync";
import { AudioPlayer } from "../components/AudioPlayer";

import { DeleteButton } from "../components/DeleteButton";
import { ExportButton } from "../components/ExportButton";

import type {
    AssemblyAiConnection,
    CompletedEventPayload,
    ErrorEventPayload,
    SpeakerType,
    SpeechModel,
    StepEventPayload,
    TranscriptionOptions,
    TranscriptionStepKey,
    TranscriptionStepsState,
    UploadItemStatus,
    UploadItem,
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

const TRANSCRIPTION_CATEGORIES = [
    "Phone Call",
    "Meeting",
    "Doctor Visit",
    "Journal",
    "Interview",
] as const;

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

const MAX_UPLOAD_FILES = 10;

const createUploadItemId = (): string =>
    `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const createUploadItem = (file: File): UploadItem => ({
    id: createUploadItemId(),
    file,
    status: "queued",
    jobId: null,
    stepsState: createInitialStepsState(),
});

const buildQueueItems = (files: File[]): UploadItem[] =>
    files.slice(0, MAX_UPLOAD_FILES).map(createUploadItem);

const getUploadItemStatusFromSteps = (
    steps: TranscriptionStepsState,
): UploadItemStatus => {
    if (Object.values(steps).some((step) => step.status === "error")) {
        return "failed";
    }

    if (steps.complete.status === "success") {
        return "completed";
    }

    if (
        steps.transcribe.status === "in_progress" ||
        steps.transcribe.status === "success" ||
        steps.save_db.status === "in_progress" ||
        steps.save_db.status === "success" ||
        steps.save_file.status === "in_progress" ||
        steps.save_file.status === "success" ||
        steps.complete.status === "in_progress"
    ) {
        return "processing";
    }

    if (
        steps.upload.status === "in_progress" ||
        steps.upload.status === "success"
    ) {
        return "uploading";
    }

    return "queued";
};

const getStatusChipColor = (
    status: UploadItemStatus,
): "default" | "success" | "error" | "warning" | "info" => {
    switch (status) {
        case "completed":
            return "success";
        case "failed":
            return "error";
        case "uploading":
            return "info";
        case "processing":
            return "warning";
        default:
            return "default";
    }
};

const getStatusLabel = (status: UploadItemStatus): string => {
    switch (status) {
        case "queued":
            return "Queued";
        case "uploading":
            return "Uploading";
        case "processing":
            return "Processing";
        case "completed":
            return "Completed";
        case "failed":
            return "Failed";
        default:
            return status;
    }
};

/**
- Builds shared request payload for all files
- Keeps model, language, and speaker logic identical to single file flow
*/
const buildUploadRequestOptions = ({
    options,
    currentSpeechModel,
    autoLanguageEnabled,
    codeSwitchingEnabled,
}: {
    options: TranscriptionOptions;
    currentSpeechModel: SpeechModel;
    autoLanguageEnabled: boolean;
    codeSwitchingEnabled: boolean;
}): {
    userOptions: Partial<TranscriptionOptions>;
    validationError: string | null;
} => {
    const userOptions: Partial<TranscriptionOptions> = {
        speech_models: buildSpeechModels(currentSpeechModel),
    };

    if (autoLanguageEnabled) {
        userOptions.language_detection = true;

        if (currentSpeechModel === "universal-2" && codeSwitchingEnabled) {
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
        userOptions.speaker_labels = true;

        userOptions.speaker_identification = {
            enabled: true,
            speaker_type: options.speaker_identification.speaker_type,
            known_values: sanitizeKnownValues(
                options.speaker_identification.known_values,
            ),
        };
    } else if (options.speaker_labels) {
        userOptions.speaker_labels = true;
        userOptions.speakers_expected = Math.max(
            1,
            options.speakers_expected ?? 1,
        );
    }

    if (
        options.speaker_identification?.enabled &&
        options.speaker_identification.speaker_type === "role"
    ) {
        const validValues = sanitizeKnownValues(
            options.speaker_identification.known_values,
        );

        if (!validValues || validValues.length === 0) {
            return {
                userOptions,
                validationError:
                    "Known values are required when using role-based identification.",
            };
        }
    }

    if (currentSpeechModel === "universal-2") {
        if (options.punctuate) userOptions.punctuate = true;
        if (options.format_text) userOptions.format_text = true;
        if (options.disfluencies) userOptions.disfluencies = true;
    }

    return { userOptions, validationError: null };
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

/**
- Normalizes known speaker inputs to match the selected speaker count
- Preserves stable input slots for the identification form
*/
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

/**
- Sanitizes known speaker values before request submission
- deletes empty entries from identification payload
*/
const sanitizeKnownValues = (
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

    const APP_FALLBACK_CONNECTION_VALUE = "app-fallback";

    const [items, setItems] = useState<UploadItem[]>([]);
    const [isProcessingQueue, setIsProcessingQueue] = useState(false);
    const [selectedResultItemId, setSelectedResultItemId] = useState<
        string | null
    >(null);
    const [batchError, setBatchError] = useState<string | null>(null);
    const [isDragOver, setIsDragOver] = useState(false);

    const [hasLocalOptionEdits, setHasLocalOptionEdits] = useState(false);
    const [options, setOptions] = useState<TranscriptionOptions>(
        defaultTranscriptionOptions,
    );
    const [selectedCategory, setSelectedCategory] = useState<string>("");
    const [speakerSectionOpen, setSpeakerSectionOpen] = useState(true);
    const [formatSectionOpen, setFormatSectionOpen] = useState(false);
    const [selectedPromptPreset, setSelectedPromptPreset] =
        useState<PromptPresetKey>("default");

    const [assemblyConnections, setAssemblyConnections] = useState<
        AssemblyAiConnection[]
    >([]);
    const [connectionsLoading, setConnectionsLoading] = useState(false);
    const [connectionsError, setConnectionsError] = useState<string | null>(
        null,
    );
    const [selectedConnectionValue, setSelectedConnectionValue] =
        useState<string>(APP_FALLBACK_CONNECTION_VALUE);

    const eventSourceRef = useRef<EventSource | null>(null);

    const updateUploadItem = useCallback(
        (itemId: string, updater: (item: UploadItem) => UploadItem) => {
            setItems((prev) =>
                prev.map((item) => (item.id === itemId ? updater(item) : item)),
            );
        },
        [],
    );
    const selectedResultItem = useMemo(
        () => items.find((item) => item.id === selectedResultItemId) ?? null,
        [items, selectedResultItemId],
    );

    const selectedTranscript = selectedResultItem?.result;
    const selectedTranscriptItemId = selectedResultItem?.id ?? null;

    const [currentTimeSeconds, setCurrentTimeSeconds] = useState(0);

    const timing = useMemo(() => {
        if (!selectedResultItem?.result) {
            return { words: null, utterances: null };
        }

        return {
            words: selectedResultItem.result.words ?? null,
            utterances: selectedResultItem.result.utterances ?? null,
        };
    }, [selectedResultItem]);

    /*
    - purpose: keep a stable object URL for playback of the selected upload result
    - inputs: the currently selected uploaded file
    - outputs: memoized blob URL for the shared audio player
    - important behavior: prevents playback from resetting on every render by avoiding
      a new object URL on each state update
    */

    const selectedResultAudioSrc = useMemo(() => {
        if (!selectedResultItem?.file) {
            return "";
        }

        return URL.createObjectURL(selectedResultItem.file);
    }, [selectedResultItem?.file]);

    useEffect(() => {
        return () => {
            if (selectedResultAudioSrc) {
                URL.revokeObjectURL(selectedResultAudioSrc);
            }
        };
    }, [selectedResultAudioSrc]);

    const {
        activeWordIndex,
        activeUtteranceIndex,
        hasWordTiming,
        hasUtteranceTiming,
    } = useTranscriptPlaybackSync({
        currentTimeSeconds,
        timing,
    });

    useEffect(() => {
        if (!preferences && !preferencesLoading) {
            void loadPreferences();
        }
    }, [preferences, preferencesLoading, loadPreferences]);

    useEffect(() => {
        let active = true;

        const loadConnections = async () => {
            try {
                setConnectionsLoading(true);
                setConnectionsError(null);

                const connections = await fetchMyAssemblyConnections();

                if (!active) return;

                setAssemblyConnections(connections);

                const defaultConnection = connections.find(
                    (connection) => connection.is_default,
                );

                setSelectedConnectionValue(
                    defaultConnection
                        ? String(defaultConnection.id)
                        : APP_FALLBACK_CONNECTION_VALUE,
                );
            } catch (error: any) {
                if (!active) return;

                setConnectionsError(
                    error?.message || "Failed to load AssemblyAI connections.",
                );
                setAssemblyConnections([]);
                setSelectedConnectionValue(APP_FALLBACK_CONNECTION_VALUE);
            } finally {
                if (active) {
                    setConnectionsLoading(false);
                }
            }
        };

        void loadConnections();

        return () => {
            active = false;
        };
    }, []);

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

    const activeQueueItem = useMemo(
        () =>
            items.find(
                (item) =>
                    item.status === "uploading" || item.status === "processing",
            ) ?? null,
        [items],
    );

    const activeQueueSteps =
        activeQueueItem?.stepsState ?? createInitialStepsState();

    const activeStepIndex = useMemo(
        () => getActiveStepIndexFromSteps(activeQueueSteps),
        [activeQueueSteps],
    );

    const currentStepLabel = useMemo(() => {
        const safeIndex = Math.min(
            activeStepIndex,
            TRANSCRIPTION_STEP_ORDER.length - 1,
        );

        return labelForStepKey(TRANSCRIPTION_STEP_ORDER[safeIndex]);
    }, [activeStepIndex]);

    /*
- Builds the aggregate status summary for the current upload batch.
- Inputs: current queue items.
- Outputs: count totals for each visible queue status.
- Important behavior: keeps the middle-panel summary chips aligned with the actual queue item statuses.
*/
    const batchSummary = useMemo(() => {
        const total = items.length;
        const queued = items.filter((item) => item.status === "queued").length;
        const uploading = items.filter(
            (item) => item.status === "uploading",
        ).length;
        const processing = items.filter(
            (item) => item.status === "processing",
        ).length;
        const completed = items.filter(
            (item) => item.status === "completed",
        ).length;
        const failed = items.filter((item) => item.status === "failed").length;

        return {
            total,
            queued,
            uploading,
            processing,
            completed,
            failed,
        };
    }, [items]);

    const rightPanelSubtitle = selectedResultItem?.result
        ? "Transcript ready."
        : activeQueueItem
          ? "Processing… this panel updates automatically."
          : "Select files and start transcription to see results here.";

    // const failedItems = useMemo(
    //     () => items.filter((item) => item.status === "failed"),
    //     [items],
    // );

    const useExplicitAppFallback =
        selectedConnectionValue === APP_FALLBACK_CONNECTION_VALUE;

    const selectedAssemblyConnectionId = useMemo(() => {
        if (useExplicitAppFallback) {
            return null;
        }

        const parsed = Number(selectedConnectionValue);
        return Number.isInteger(parsed) ? parsed : null;
    }, [selectedConnectionValue, useExplicitAppFallback]);

    const selectedAssemblyConnection = useMemo(() => {
        if (selectedAssemblyConnectionId == null) return null;

        return (
            assemblyConnections.find(
                (connection) => connection.id === selectedAssemblyConnectionId,
            ) ?? null
        );
    }, [assemblyConnections, selectedAssemblyConnectionId]);

    const selectedConnectionHelperText = selectedAssemblyConnection
        ? `Using saved connection: ${selectedAssemblyConnection.label}`
        : "Using the app default AssemblyAI key.";

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
        options.speaker_identification?.known_values,
        options.speakers_expected ?? 1,
    );

    const knownValuePlaceholder =
        currentSpeakerType === "role" ? "e.g. Host" : "e.g. Maya";

    const codeSwitchingSupported = true;

    const languageSelectionDisabled = codeSwitchingEnabled;

    useEffect(() => {
        setSelectedPromptPreset(
            isUniversal3Pro ? getPromptPresetKey(options.prompt) : "default",
        );
    }, [isUniversal3Pro, options.prompt]);

    useEffect(() => {
        if (!speakerIdentificationEnabled) return;

        setOptions((prev) => {
            const nextValues = normalizeKnownSpeakerInputs(
                prev.speaker_identification?.known_values,
                prev.speakers_expected ?? 1,
            );

            const currentValues =
                prev.speaker_identification?.known_values ?? [];
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
                    known_values: nextValues,
                },
            };
        });
    }, [speakerIdentificationEnabled, options.speakers_expected]);

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

    useEffect(() => {
        if (selectedResultItem?.result) {
            return;
        }

        const latestCompletedItem = [...items]
            .reverse()
            .find((item) => item.result);

        if (latestCompletedItem) {
            setSelectedResultItemId(latestCompletedItem.id);
        }
    }, [items, selectedResultItem]);

    const handleSelectModel = (model: SpeechModel): void => {
        setHasLocalOptionEdits(true);

        setOptions((prev) => {
            const nextLanguages = modelLanguages[model] ?? ["en"];
            const prevKnownValues = prev.speaker_identification?.known_values;

            const nextLanguageCode =
                prev.language_code === AUTO_LANGUAGE_CODE ||
                prev.language_detection ||
                prev.language_detection_options?.code_switching
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
                language_detection_options: prev.language_detection_options
                    ?.code_switching
                    ? { code_switching: true }
                    : undefined,
                prompt: model === "universal-2" ? "" : (prev.prompt ?? ""),
                speaker_identification: prev.speaker_identification?.enabled
                    ? {
                          enabled: true,
                          speaker_type:
                              prev.speaker_identification?.speaker_type ??
                              "name",
                          known_values: normalizeKnownSpeakerInputs(
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
                language_detection_options:
                    selectingAuto &&
                    prev.language_detection_options?.code_switching
                        ? { code_switching: true }
                        : undefined,
            };
        });
    };

    const handleCodeSwitchingToggle = (enabled: boolean): void => {
        setHasLocalOptionEdits(true);

        setOptions((prev) => ({
            ...prev,
            language_code: enabled ? AUTO_LANGUAGE_CODE : prev.language_code,
            language_detection: enabled ? true : undefined,
            language_detection_options: enabled
                ? { code_switching: true }
                : undefined,
        }));
    };

    /**
- Toggles speaker label mode in upload options
- Disables identification when labels are turned off
*/
    const handleSpeakerLabelsToggle = (enabled: boolean): void => {
        setHasLocalOptionEdits(true);

        setOptions((prev) => ({
            ...prev,
            speaker_labels: enabled,
            speakers_expected: Math.max(1, prev.speakers_expected ?? 1),
            speaker_identification: enabled
                ? prev.speaker_identification
                : undefined,
        }));
    };

    /**
- Updates expected speaker count in upload options
- Keeps identification inputs aligned with the selected count
*/
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
                      known_values: normalizeKnownSpeakerInputs(
                          prev.speaker_identification.known_values,
                          nextCount,
                      ),
                  }
                : prev.speaker_identification,
        }));
    };

    /**
- Toggles speaker identification mode in upload options
- Identification depends on speaker labels in the backend request
*/
    const handleSpeakerIdentificationToggle = (enabled: boolean): void => {
        setHasLocalOptionEdits(true);

        setOptions((prev) => {
            if (!prev.speaker_labels) {
                return prev;
            }

            return {
                ...prev,
                speaker_identification: enabled
                    ? {
                          enabled: true,
                          speaker_type:
                              prev.speaker_identification?.speaker_type ??
                              "name",
                          known_values: normalizeKnownSpeakerInputs(
                              prev.speaker_identification?.known_values,
                              prev.speakers_expected ?? 1,
                          ),
                      }
                    : undefined,
            };
        });
    };

    /**
- Updates speaker identification type in upload options
- Preserves normalized known speaker inputs
*/
    const handleSpeakerTypeChange = (speakerType: SpeakerType): void => {
        setHasLocalOptionEdits(true);

        setOptions((prev) => ({
            ...prev,
            speaker_identification: {
                enabled: true,
                speaker_type: speakerType,
                known_values: normalizeKnownSpeakerInputs(
                    prev.speaker_identification?.known_values,
                    prev.speakers_expected ?? 1,
                ),
            },
        }));
    };

    /**
- Updates a single known speaker input in upload options
- Preserves the current identification configuration
*/
    const handleKnownSpeakerChange = (index: number, value: string): void => {
        setHasLocalOptionEdits(true);

        setOptions((prev) => {
            const nextValues = normalizeKnownSpeakerInputs(
                prev.speaker_identification?.known_values,
                prev.speakers_expected ?? 1,
            );

            nextValues[index] = value;

            return {
                ...prev,
                speaker_identification: {
                    enabled: true,
                    speaker_type:
                        prev.speaker_identification?.speaker_type ?? "name",
                    known_values: nextValues,
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
                    known_values: normalizeKnownSpeakerInputs(
                        prev.speaker_identification?.known_values,
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

    /*
- Attaches the SSE progress stream for one queued upload item.
- Inputs: queue item id and backend job id.
- Outputs: resolves when tracking reaches a terminal event or the stream disconnects.
- Important behavior: treats browser-side SSE loss as recoverable tracking failure, not proof that the backend job itself failed.
*/
    const attachProgressStream = useCallback(
        async (itemId: string, jobId: string): Promise<void> => {
            const progressUrl = getTranscriptionProgressUrl(jobId);
            const eventSource = new EventSource(progressUrl, {
                withCredentials: true,
            });

            eventSourceRef.current = eventSource;

            await new Promise<void>((resolve) => {
                let settled = false;

                const finish = () => {
                    if (settled) return;
                    settled = true;
                    eventSource.close();

                    if (eventSourceRef.current === eventSource) {
                        eventSourceRef.current = null;
                    }

                    resolve();
                };

                const handleStep = (event: MessageEvent) => {
                    try {
                        const payload = JSON.parse(
                            event.data,
                        ) as StepEventPayload;

                        updateUploadItem(itemId, (prev) => {
                            const updatedSteps = {
                                ...prev.stepsState,
                                ...payload.steps,
                            };

                            return {
                                ...prev,
                                stepsState: updatedSteps,
                                status: getUploadItemStatusFromSteps(
                                    updatedSteps,
                                ),
                                error: undefined,
                            };
                        });
                    } catch {
                        updateUploadItem(itemId, (prev) => ({
                            ...prev,
                            status: "failed",
                            error: "Invalid progress response.",
                        }));

                        finish();
                    }
                };

                const handleCompleted = (event: MessageEvent) => {
                    try {
                        const payload = JSON.parse(
                            event.data,
                        ) as CompletedEventPayload;

                        updateUploadItem(itemId, (prev) => ({
                            ...prev,
                            status: "completed",
                            result: payload.transcriptData,
                            stepsState: payload.steps,
                            error: undefined,
                        }));

                        finish();
                    } catch {
                        updateUploadItem(itemId, (prev) => ({
                            ...prev,
                            status: "failed",
                            error: "Invalid completed response.",
                        }));

                        finish();
                    }
                };

                const handleErrorEvent = (event: MessageEvent) => {
                    try {
                        const payload = JSON.parse(
                            event.data,
                        ) as ErrorEventPayload;

                        updateUploadItem(itemId, (prev) => ({
                            ...prev,
                            status: "failed",
                            stepsState: payload.steps ?? prev.stepsState,
                            error:
                                payload.message ||
                                payload.error ||
                                "This transcription failed.",
                        }));
                    } catch {
                        updateUploadItem(itemId, (prev) => ({
                            ...prev,
                            status: "failed",
                            error: "Invalid error response.",
                        }));
                    }

                    finish();
                };

                eventSource.addEventListener(
                    "step",
                    handleStep as EventListener,
                );
                eventSource.addEventListener(
                    "completed",
                    handleCompleted as EventListener,
                );
                eventSource.addEventListener(
                    "error",
                    handleErrorEvent as EventListener,
                );

                eventSource.onerror = () => {
                    updateUploadItem(itemId, (prev) => {
                        const derivedStatus = getUploadItemStatusFromSteps(
                            prev.stepsState,
                        );

                        return {
                            ...prev,
                            status:
                                derivedStatus === "completed"
                                    ? "completed"
                                    : "failed",
                            error:
                                derivedStatus === "completed"
                                    ? prev.error
                                    : "Live progress tracking was interrupted. The transcription may still finish in the background. Retry tracking to reconnect.",
                        };
                    });

                    finish();
                };
            });
        },
        [updateUploadItem],
    );

    /*
- purpose: handle the full lifecycle for one queued upload item
- inputs: queue item, frozen transcription options, frozen connection id, and frozen app-fallback mode
- outputs: resolves after the item starts successfully and progress tracking is attached, or after failure is recorded
- important behavior:
  - starts exactly one backend job for the current item
  - keeps sequential queue behavior unchanged
  - reuses the shared SSE attach helper for live progress updates
*/
    const runSingleUpload = async (
        item: UploadItem,
        sharedOptions: Partial<TranscriptionOptions>,
        assemblyaiConnectionId: number | null,
        useAppFallback: boolean,
    ): Promise<void> => {
        try {
            updateUploadItem(item.id, (prev) => ({
                ...prev,
                status: "uploading",
                stepsState: createInitialStepsState(),
                error: undefined,
            }));

            const response = await startTranscriptionJob({
                file: item.file,
                options: sharedOptions,
                category: selectedCategory.trim() || null,
                assemblyai_connection_id: assemblyaiConnectionId,
                use_app_fallback: useAppFallback,
            });

            if (!response?.success || !response.jobId) {
                throw new Error("Failed to start transcription job.");
            }

            updateUploadItem(item.id, (prev) => ({
                ...prev,
                jobId: response.jobId,
            }));

            await attachProgressStream(item.id, response.jobId);
        } catch (error: any) {
            updateUploadItem(item.id, (prev) => ({
                ...prev,
                status: "failed",
                error: error?.message || "Upload failed.",
            }));
        }
    };

    /**
- Processes queued items one-by-one
- Prevents parallel API requests
*/
    const processQueueSequentially = async () => {
        if (isProcessingQueue) return;

        window.scrollTo({
            top: 0,
            behavior: "smooth",
        });

        setIsProcessingQueue(true);
        setBatchError(null);

        try {
            const { userOptions, validationError } = buildUploadRequestOptions({
                options,
                currentSpeechModel,
                autoLanguageEnabled,
                codeSwitchingEnabled,
            });

            if (validationError) {
                setBatchError(validationError);
                return;
            }

            /*
        Freeze the selected connection mode for the full batch to preserve
        sequential behavior and predictable result ownership.
        */
            const frozenConnectionId = selectedAssemblyConnectionId;
            const frozenUseAppFallback = useExplicitAppFallback;

            for (const item of items) {
                if (item.status !== "queued") continue;

                await runSingleUpload(
                    item,
                    userOptions,
                    frozenConnectionId,
                    frozenUseAppFallback,
                );
            }
        } finally {
            setIsProcessingQueue(false);
        }
    };

    const handleFileSelect = (files: FileList | null) => {
        if (!files) return;

        const fileArray = Array.from(files);
        const availableSlots = Math.max(0, MAX_UPLOAD_FILES - items.length);

        if (availableSlots === 0) {
            setBatchError(
                `You can upload up to ${MAX_UPLOAD_FILES} files at once.`,
            );
            return;
        }

        const nextFiles = fileArray.slice(0, availableSlots);
        const newItems = buildQueueItems(nextFiles);

        setItems((prev) => [...prev, ...newItems]);
        setBatchError(null);

        if (!selectedResultItemId && newItems[0]) {
            setSelectedResultItemId(newItems[0].id);
        }
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragOver(false);

        if (e.dataTransfer.files?.length) {
            handleFileSelect(e.dataTransfer.files);
        }
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragOver(true);
    };

    const handleDragLeave = () => {
        setIsDragOver(false);
    };

    const handleSelectResultItem = (itemId: string) => {
        setSelectedResultItemId(itemId);
    };

    const handleRemoveQueueItem = (itemId: string) => {
        setItems((prev) => {
            const nextItems = prev.filter((item) => item.id !== itemId);

            setSelectedResultItemId((currentSelectedId) => {
                if (currentSelectedId !== itemId) return currentSelectedId;
                return nextItems[0]?.id ?? null;
            });

            return nextItems;
        });
    };

    const handleClearCompletedItems = () => {
        setItems((prev) => {
            const nextItems = prev.filter(
                (item) =>
                    item.status !== "completed" && item.status !== "failed",
            );

            setSelectedResultItemId((currentSelectedId) => {
                if (!currentSelectedId) return nextItems[0]?.id ?? null;

                const stillExists = nextItems.some(
                    (item) => item.id === currentSelectedId,
                );

                return stillExists
                    ? currentSelectedId
                    : (nextItems[0]?.id ?? null);
            });

            return nextItems;
        });
    };

    /*
- Retries SSE tracking for an existing backend job.
- Inputs: queue item that already has a job id.
- Outputs: reconnects the right-side status/result view to the in-flight job when possible.
- Important behavior: does not create a new transcription job; it only reconnects to the existing job stream.
*/
    const handleRetryTracking = (item: UploadItem): void => {
        if (!item.jobId) return;

        updateUploadItem(item.id, (prev) => ({
            ...prev,
            error: undefined,
            status: getUploadItemStatusFromSteps(prev.stepsState),
        }));

        void attachProgressStream(item.id, item.jobId);
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
                maxWidth: 1660,
                mx: "auto",
                px: { xs: 1, md: 1 },
                py: 1,
            }}
        >
            <Box
                sx={{
                    display: "grid",
                    columnGap: {
                        xs: 2,
                        sm: 2.5,
                        md: 3,
                        lg: 4,
                        xl: 5,
                    },
                    rowGap: 3,
                    gridTemplateColumns: {
                        xs: "1fr",
                        xl: "540px 420px 520px",
                    },
                    justifyContent: "center",
                    alignItems: "start",
                }}
            >
                {/* LEFT PANEL — upload controls / transcription options / start action */}
                <Paper
                    sx={{
                        p: 3,
                        width: { xs: "100%", xl: 560 },
                        flex: { xl: "0 0 520px" },
                        minWidth: 0,
                        borderRadius: 3,
                        border: `1px solid ${theme.palette.divider}`,
                        display: "flex",
                        flexDirection: "column",
                        gap: 2,
                        transition: "box-shadow 150ms ease",
                        "&:hover": { boxShadow: 2 },
                    }}
                >
                    {/* LEFT PANEL HEADER — title / batch status / top-level feedback       */}
                    <Box>
                        <Typography variant="h5">Transcribe Audio</Typography>

                        {activeQueueItem?.jobId ? (
                            <Typography
                                variant="body2"
                                sx={{ color: "text.secondary", mt: 0.5 }}
                            >
                                Active job: {activeQueueItem.jobId}
                            </Typography>
                        ) : null}
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
                                            activeQueueSteps[key].status ===
                                            "error"
                                        }
                                    >
                                        {labelForStepKey(key)}
                                    </StepLabel>
                                </Step>
                            ))}
                        </Stepper>

                        {activeQueueItem ? (
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
                                    Current file: {activeQueueItem.file.name}
                                </Typography>
                                <Typography
                                    variant="body2"
                                    sx={{ color: "text.secondary", mt: 0.5 }}
                                >
                                    Current step: {currentStepLabel}
                                </Typography>
                            </Box>
                        ) : null}

                        {/* LEFT PANEL BATCH ERROR — batch-level validation or request errors   */}
                        {batchError ? (
                            <Box mt={2}>
                                <Alert severity="error" variant="outlined">
                                    {batchError}
                                </Alert>
                            </Box>
                        ) : null}
                    </Box>

                    <Divider sx={{ borderColor: theme.palette.divider }} />

                    {/* LEFT PANEL UPLOAD AREA — drag/drop + choose files                   */}
                    <Box
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        sx={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: 1.5,
                            p: 2,
                            borderRadius: 2,
                            border: `1px dashed ${
                                isDragOver
                                    ? colors.greenAccent[500]
                                    : theme.palette.divider
                            }`,
                            backgroundColor: isDragOver
                                ? theme.palette.action.hover
                                : "transparent",
                            transition:
                                "border-color 150ms ease, background-color 150ms ease",
                        }}
                    >
                        <Button
                            variant="outlined"
                            component="label"
                            startIcon={<UploadFileOutlinedIcon />}
                            disabled={isProcessingQueue}
                            sx={{
                                width: "fit-content",
                                alignSelf: "center",
                                color: colors.grey[100],
                                borderColor: colors.grey[300],
                                "&:hover": {
                                    borderColor: colors.grey[200],
                                    backgroundColor: theme.palette.action.hover,
                                },
                            }}
                        >
                            Choose Audio Files
                            <input
                                hidden
                                type="file"
                                accept="audio/*"
                                multiple
                                onChange={(e) => {
                                    handleFileSelect(e.target.files);
                                    e.target.value = "";
                                }}
                            />
                        </Button>

                        <Typography
                            variant="body2"
                            sx={{ color: "text.secondary" }}
                        >
                            Drag and drop up to {MAX_UPLOAD_FILES} audio files,
                            or click to browse.
                        </Typography>

                        <FormHelperText sx={{ m: 0, color: "text.secondary" }}>
                            All files in the batch use the current transcription
                            options.
                        </FormHelperText>
                    </Box>

                    <Divider sx={{ borderColor: theme.palette.divider }} />

                    {/* LEFT PANEL OPTIONS — speech model / language / speaker / format     */}
                    <Box
                        sx={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 2,
                        }}
                    >
                        {/* ROW 2 — speech model + language */}
                        <Box
                            sx={{
                                display: "grid",
                                gridTemplateColumns: {
                                    xs: "1fr",
                                    md: "1fr 1fr",
                                },
                                gap: 2,
                                alignItems: "stretch",
                            }}
                        >
                            <Box
                                sx={{
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: 1,
                                    p: 2,
                                    height: "100%",
                                    borderRadius: 2,
                                    border: `1px solid ${theme.palette.divider}`,
                                }}
                            >
                                <Typography
                                    variant="subtitle2"
                                    sx={{ color: "text.secondary" }}
                                >
                                    Speech model
                                </Typography>

                                <Box
                                    sx={{
                                        display: "flex",
                                        gap: 1,
                                        flexWrap: "wrap",
                                    }}
                                >
                                    {renderModelButton("universal-3-pro")}
                                    {renderModelButton("universal-2")}
                                </Box>
                            </Box>

                            <Box
                                sx={{
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: 1.25,
                                    p: 2,
                                    height: "100%",
                                    borderRadius: 2,
                                    border: `1px solid ${theme.palette.divider}`,
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
                                        "&:hover .MuiOutlinedInput-notchedOutline":
                                            {
                                                borderColor: colors.grey[200],
                                            },
                                        "& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline":
                                            {
                                                borderColor:
                                                    colors.greenAccent[500],
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
                                        disabled={languageSelectionDisabled}
                                        onChange={(e) =>
                                            handleLanguageChange(
                                                String(e.target.value),
                                            )
                                        }
                                    >
                                        <MenuItem value={AUTO_LANGUAGE_CODE}>
                                            {getLanguageLabel(
                                                AUTO_LANGUAGE_CODE,
                                            )}
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
                                            disabled={!codeSwitchingSupported}
                                            onChange={(e) =>
                                                handleCodeSwitchingToggle(
                                                    e.target.checked,
                                                )
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
                                    label={
                                        <InfoLabel
                                            label="Code Switching"
                                            tooltip="Transcribes speech that naturally switches between multiple languages in the same conversation. When enabled, the request uses automatic language detection instead of a fixed language."
                                        />
                                    }
                                />
                            </Box>
                        </Box>

                        {/* ROW 3 — prompt + custom prompt */}
                        {isUniversal3Pro ? (
                            <Box
                                sx={{
                                    display: "grid",
                                    gridTemplateColumns: {
                                        xs: "1fr",
                                        md: "1fr 1fr",
                                    },
                                    gap: 2,
                                    alignItems: "stretch",
                                }}
                            >
                                <Box
                                    sx={{
                                        display: "flex",
                                        flexDirection: "column",
                                        gap: 1.25,
                                        p: 2,
                                        height: "100%",
                                        borderRadius: 2,
                                        border: `1px solid ${theme.palette.divider}`,
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
                                                            <Box
                                                                sx={{
                                                                    display:
                                                                        "flex",
                                                                    alignItems:
                                                                        "center",
                                                                    gap: 0.75,
                                                                }}
                                                            >
                                                                <Typography
                                                                    variant="body2"
                                                                    sx={{
                                                                        fontWeight: 600,
                                                                    }}
                                                                >
                                                                    {
                                                                        preset.label
                                                                    }
                                                                </Typography>

                                                                <Tooltip
                                                                    title={
                                                                        preset.helper
                                                                    }
                                                                    arrow
                                                                    slotProps={{
                                                                        tooltip:
                                                                            {
                                                                                sx: TOOLTIP_SX,
                                                                            },
                                                                    }}
                                                                >
                                                                    <IconButton
                                                                        size="small"
                                                                        onClick={(
                                                                            e,
                                                                        ) => {
                                                                            e.preventDefault();
                                                                            e.stopPropagation();
                                                                        }}
                                                                        sx={{
                                                                            p: 0.25,
                                                                            color: "text.secondary",
                                                                        }}
                                                                    >
                                                                        <InfoOutlinedIcon fontSize="inherit" />
                                                                    </IconButton>
                                                                </Tooltip>
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
                                </Box>

                                <Box
                                    sx={{
                                        display: "flex",
                                        flexDirection: "column",
                                        gap: 1.25,
                                        p: 2,
                                        height: "100%",
                                        borderRadius: 2,
                                        border: `1px solid ${theme.palette.divider}`,
                                    }}
                                >
                                    <Typography
                                        variant="subtitle2"
                                        sx={{ color: "text.secondary" }}
                                    >
                                        Custom prompt
                                    </Typography>

                                    <TextField
                                        label="Prompt input"
                                        value={options.prompt ?? ""}
                                        onChange={(e) =>
                                            handlePromptInputChange(
                                                e.target.value,
                                            )
                                        }
                                        size="small"
                                        multiline
                                        minRows={8}
                                        placeholder="e.g. Preserve mixed-language speech, keep filler words, and do not normalize false starts."
                                        helperText="You can pick a recommended prompt, then edit it here."
                                    />
                                </Box>
                            </Box>
                        ) : null}

                        {/* ROW 4 — speaker handling + format transcript */}
                        <Box
                            sx={{
                                display: "grid",
                                gridTemplateColumns: {
                                    xs: "1fr",
                                    md: "1fr 1fr",
                                },
                                gap: 2,
                                alignItems: "start",
                            }}
                        >
                            <Accordion
                                disableGutters
                                elevation={0}
                                expanded={speakerSectionOpen}
                                onChange={() =>
                                    setSpeakerSectionOpen((prev) => !prev)
                                }
                                sx={{
                                    borderRadius: 2,
                                    border: `1px solid ${theme.palette.divider}`,
                                    backgroundColor: "transparent",
                                    "&:before": { display: "none" },
                                    "&.Mui-expanded": { margin: 0 },
                                    alignSelf: "start",
                                }}
                            >
                                <AccordionSummary
                                    expandIcon={<ExpandMoreIcon />}
                                >
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
                                                    label="Speaker Label"
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
                                                    label="Speaker ID"
                                                    tooltip="Uses known names or roles to guide speaker identification. This mode keeps speaker labels on but does not send an expected-speaker count to AssemblyAI."
                                                />
                                            }
                                        />
                                    </Box>

                                    <TextField
                                        label={
                                            speakerIdentificationEnabled
                                                ? "Known speakers"
                                                : "Speakers expected"
                                        }
                                        type="number"
                                        value={options.speakers_expected ?? 1}
                                        onChange={(e) =>
                                            handleSpeakersExpectedChange(
                                                e.target.value,
                                            )
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
                                                ? "Used only to size the known-speaker input list. It is not sent in the identification request."
                                                : diarizationEnabled
                                                  ? "Used to improve speaker labeling."
                                                  : "Enable Speaker Label or Speaker ID to configure speaker handling."
                                        }
                                    />

                                    {speakerIdentificationEnabled ? (
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
                                                    label={
                                                        currentSpeakerType ===
                                                        "role"
                                                            ? "Known values (required)"
                                                            : "Known values (optional)"
                                                    }
                                                    tooltip={
                                                        currentSpeakerType ===
                                                        "role"
                                                            ? "Provide all expected roles. Role-based identification requires known values."
                                                            : "Add names you expect in the recording."
                                                    }
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
                                                                    e.target
                                                                        .value,
                                                                )
                                                            }
                                                        />
                                                    ),
                                                )}

                                                <Button
                                                    variant="text"
                                                    startIcon={
                                                        <AddCircleOutlineIcon />
                                                    }
                                                    onClick={
                                                        handleAddKnownValueField
                                                    }
                                                    sx={{
                                                        justifyContent:
                                                            "flex-start",
                                                        width: "fit-content",
                                                        textTransform: "none",
                                                        px: 0,
                                                    }}
                                                >
                                                    Add another known value
                                                </Button>
                                            </Box>
                                        </>
                                    ) : null}
                                </AccordionDetails>
                            </Accordion>

                            <Accordion
                                disableGutters
                                elevation={0}
                                expanded={formatSectionOpen}
                                onChange={() =>
                                    setFormatSectionOpen((prev) => !prev)
                                }
                                sx={{
                                    borderRadius: 2,
                                    border: `1px solid ${theme.palette.divider}`,
                                    backgroundColor: "transparent",
                                    "&:before": { display: "none" },
                                    "&.Mui-expanded": { margin: 0 },
                                    alignSelf: "start",
                                }}
                            >
                                <AccordionSummary
                                    expandIcon={<ExpandMoreIcon />}
                                >
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
                        </Box>

                        {/* ROW 5 — Category + Project (AssemblyAI Key) */}
                        <Box
                            sx={{
                                display: "flex",
                                flexDirection: { xs: "column", md: "row" },
                                alignItems: "stretch",
                                justifyContent: "center",
                                gap: 1.25,
                                pt: 0.5,
                            }}
                        >
                            <FormControl
                                disabled={isProcessingQueue}
                                sx={{
                                    flex: 1,
                                    minWidth: { xs: "100%", md: 260 },
                                }}
                            >
                                <InputLabel id="transcription-category-select-label">
                                    Category
                                </InputLabel>
                                <Select
                                    labelId="transcription-category-select-label"
                                    value={selectedCategory || "None"}
                                    label="Category"
                                    onChange={(event) =>
                                        setSelectedCategory(
                                            String(event.target.value),
                                        )
                                    }
                                >
                                    <MenuItem value="None">None</MenuItem>

                                    {TRANSCRIPTION_CATEGORIES.map(
                                        (category) => (
                                            <MenuItem
                                                key={category}
                                                value={category}
                                            >
                                                {category}
                                            </MenuItem>
                                        ),
                                    )}
                                </Select>

                                <FormHelperText>
                                    Optional metadata used for history display
                                    and filtering.
                                </FormHelperText>
                            </FormControl>

                            <FormControl
                                disabled={
                                    isProcessingQueue || connectionsLoading
                                }
                                sx={{
                                    flex: 1,
                                    minWidth: { xs: "100%", md: 260 },
                                }}
                            >
                                <InputLabel id="assembly-connection-select-label">
                                    Project (AssemblyAI Key)
                                </InputLabel>
                                <Select
                                    labelId="assembly-connection-select-label"
                                    value={selectedConnectionValue}
                                    label="Project (AssemblyAI Key)"
                                    onChange={(event) =>
                                        setSelectedConnectionValue(
                                            String(event.target.value),
                                        )
                                    }
                                >
                                    <MenuItem
                                        value={APP_FALLBACK_CONNECTION_VALUE}
                                    >
                                        App default key
                                    </MenuItem>

                                    {assemblyConnections.map((connection) => (
                                        <MenuItem
                                            key={connection.id}
                                            value={String(connection.id)}
                                        >
                                            {connection.label}
                                            {connection.is_default
                                                ? " (default)"
                                                : ""}
                                        </MenuItem>
                                    ))}
                                </Select>

                                <FormHelperText>
                                    {connectionsLoading
                                        ? "Loading your saved connections..."
                                        : selectedConnectionHelperText}
                                </FormHelperText>
                            </FormControl>

                            {connectionsError ? (
                                <Alert
                                    severity="warning"
                                    sx={{
                                        width: "fit-content",
                                        minWidth: { xs: "100%", md: 260 },
                                        maxWidth: "100%",
                                    }}
                                >
                                    {connectionsError}
                                </Alert>
                            ) : null}
                        </Box>

                        {/* ROW 6 — start button */}
                        <Box
                            sx={{
                                display: "flex",
                                justifyContent: "center",
                                pt: 0.5,
                            }}
                        >
                            <Button
                                variant="contained"
                                onClick={processQueueSequentially}
                                disabled={
                                    isProcessingQueue || items.length === 0
                                }
                                sx={{
                                    width: "fit-content",
                                    px: 2.5,
                                    py: 1.25,
                                    fontWeight: 600,
                                    backgroundColor: colors.greenAccent[500],
                                    color: theme.palette.getContrastText(
                                        colors.greenAccent[500],
                                    ),
                                    "&:hover": {
                                        backgroundColor:
                                            colors.greenAccent[600],
                                    },
                                    "&.Mui-disabled": {
                                        backgroundColor:
                                            theme.palette.action
                                                .disabledBackground,
                                        color: theme.palette.action.disabled,
                                    },
                                }}
                            >
                                {isProcessingQueue
                                    ? "Processing Batch..."
                                    : "Start Transcription Batch"}
                            </Button>
                        </Box>
                    </Box>
                </Paper>

                {/* MIDDLE PANEL — upload queue / failed items / batch summary */}
                <Paper
                    sx={{
                        p: 3,
                        width: { xs: "100%", xl: 430 },
                        minWidth: 0,
                        borderRadius: 3,
                        border: `1px solid ${theme.palette.divider}`,
                        display: "flex",
                        flexDirection: "column",
                        gap: 2,
                        height: "auto",
                        minHeight: 0,
                        maxHeight: { xl: "min(120vh, 1200px)" },
                        overflow: "hidden",
                        alignSelf: "start",
                        transition: "box-shadow 150ms ease",
                        "&:hover": { boxShadow: 2 },
                    }}
                >
                    {/* MIDDLE PANEL HEADER — queue title + processed action*/}
                    <Box
                        sx={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 2,
                        }}
                    >
                        <Typography variant="subtitle1" fontWeight={700}>
                            Upload queue
                        </Typography>

                        {(batchSummary.completed > 0 ||
                            batchSummary.failed > 0) && (
                            <Button
                                size="small"
                                onClick={handleClearCompletedItems}
                                disabled={isProcessingQueue}
                                sx={{ textTransform: "none" }}
                            >
                                Clear processed
                            </Button>
                        )}
                    </Box>

                    {/* MIDDLE PANEL QUEUE LIST*/}
                    <Box
                        sx={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 1,
                            pr: 0.5,
                            overflowY: "auto",
                            maxHeight: { xl: "min(92vh, 920px)" },
                        }}
                    >
                        {items.length === 0 ? (
                            <Box
                                sx={{
                                    minHeight: 120,
                                    display: "flex",
                                    alignItems: "center",
                                }}
                            >
                                <Typography
                                    variant="body2"
                                    sx={{ color: "text.secondary" }}
                                >
                                    No files added yet.
                                </Typography>
                            </Box>
                        ) : (
                            items.map((item) => {
                                const itemActiveStepIndex =
                                    getActiveStepIndexFromSteps(
                                        item.stepsState,
                                    );
                                const itemStepLabel = labelForStepKey(
                                    TRANSCRIPTION_STEP_ORDER[
                                        itemActiveStepIndex
                                    ],
                                );

                                return (
                                    <Paper
                                        key={item.id}
                                        variant="outlined"
                                        onClick={() =>
                                            handleSelectResultItem(item.id)
                                        }
                                        sx={{
                                            p: 1.5,
                                            borderRadius: 2,
                                            cursor: "pointer",
                                            borderColor:
                                                selectedResultItemId === item.id
                                                    ? colors.greenAccent[500]
                                                    : theme.palette.divider,
                                            backgroundColor:
                                                selectedResultItemId === item.id
                                                    ? theme.palette.action.hover
                                                    : "transparent",
                                        }}
                                    >
                                        {/* QUEUE ITEM ROW — file info + status/actions */}
                                        <Box
                                            sx={{
                                                display: "flex",
                                                alignItems: "flex-start",
                                                justifyContent: "space-between",
                                                gap: 1,
                                            }}
                                        >
                                            {/* QUEUE ITEM LEFT — file name / size / errors */}
                                            <Box
                                                sx={{
                                                    minWidth: 0,
                                                    flex: 1,
                                                }}
                                            >
                                                <Typography
                                                    variant="body2"
                                                    sx={{
                                                        fontWeight: 600,
                                                        wordBreak: "break-word",
                                                    }}
                                                >
                                                    {item.file.name}
                                                </Typography>

                                                <Typography
                                                    variant="caption"
                                                    sx={{
                                                        color: "text.secondary",
                                                        display: "block",
                                                        mt: 0.5,
                                                    }}
                                                >
                                                    {Math.round(
                                                        item.file.size / 1024,
                                                    )}{" "}
                                                    KB
                                                </Typography>

                                                {(item.status === "uploading" ||
                                                    item.status ===
                                                        "processing") && (
                                                    <Typography
                                                        variant="caption"
                                                        sx={{
                                                            color: "text.secondary",
                                                            display: "block",
                                                            mt: 0.5,
                                                        }}
                                                    >
                                                        Step: {itemStepLabel}
                                                    </Typography>
                                                )}

                                                {item.error ? (
                                                    <Typography
                                                        variant="caption"
                                                        sx={{
                                                            color: theme.palette
                                                                .error.main,
                                                            display: "block",
                                                            mt: 0.5,
                                                        }}
                                                    >
                                                        {item.jobId &&
                                                        item.status === "failed"
                                                            ? "Tracking interrupted. Retry to reconnect."
                                                            : item.error}
                                                    </Typography>
                                                ) : null}
                                            </Box>

                                            {/* QUEUE ITEM RIGHT — status / remove / retry */}
                                            <Box
                                                sx={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: 1,
                                                    flexWrap: "wrap",
                                                    justifyContent: "flex-end",
                                                }}
                                            >
                                                <Chip
                                                    size="small"
                                                    label={getStatusLabel(
                                                        item.status,
                                                    )}
                                                    color={getStatusChipColor(
                                                        item.status,
                                                    )}
                                                    variant={
                                                        item.status === "queued"
                                                            ? "outlined"
                                                            : "filled"
                                                    }
                                                />

                                                {!isProcessingQueue ||
                                                item.status === "queued" ||
                                                item.status === "completed" ||
                                                item.status === "failed" ? (
                                                    <Button
                                                        size="small"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleRemoveQueueItem(
                                                                item.id,
                                                            );
                                                        }}
                                                        sx={{
                                                            minWidth: "auto",
                                                            px: 1,
                                                            textTransform:
                                                                "none",
                                                        }}
                                                    >
                                                        Remove
                                                    </Button>
                                                ) : null}

                                                {/* QUEUE ITEM RETRY — reconnect SSE tracking  */}
                                                {item.jobId &&
                                                item.status === "failed" ? (
                                                    <Button
                                                        size="small"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleRetryTracking(
                                                                item,
                                                            );
                                                        }}
                                                        sx={{
                                                            minWidth: "auto",
                                                            px: 1,
                                                            textTransform:
                                                                "none",
                                                        }}
                                                    >
                                                        Retry tracking
                                                    </Button>
                                                ) : null}
                                            </Box>
                                        </Box>
                                    </Paper>
                                );
                            })
                        )}
                    </Box>

                    <Divider />

                    {/* MIDDLE PANEL FOOTER — batch summary section  */}
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
                            Batch summary
                        </Typography>

                        <Box
                            sx={{
                                display: "flex",
                                flexWrap: "wrap",
                                gap: 1,
                            }}
                        >
                            <Chip
                                size="small"
                                label={`Queued: ${batchSummary.queued}`}
                                variant="outlined"
                            />
                            <Chip
                                size="small"
                                label={`Uploading: ${batchSummary.uploading}`}
                                color="info"
                                variant={
                                    batchSummary.uploading > 0
                                        ? "filled"
                                        : "outlined"
                                }
                            />
                            <Chip
                                size="small"
                                label={`Processing: ${batchSummary.processing}`}
                                color="warning"
                                variant={
                                    batchSummary.processing > 0
                                        ? "filled"
                                        : "outlined"
                                }
                            />
                            <Chip
                                size="small"
                                label={`Completed: ${batchSummary.completed}`}
                                color="success"
                                variant={
                                    batchSummary.completed > 0
                                        ? "filled"
                                        : "outlined"
                                }
                            />
                            <Chip
                                size="small"
                                label={`Failed: ${batchSummary.failed}`}
                                color="error"
                                variant={
                                    batchSummary.failed > 0
                                        ? "filled"
                                        : "outlined"
                                }
                            />
                        </Box>
                    </Box>
                </Paper>

                {/* RIGHT PANEL — selected result / status / transcript rendering  */}
                <Paper
                    sx={{
                        p: 3,
                        width: { xs: "100%", xl: 540 },
                        minWidth: 0,
                        justifySelf: "center",
                        borderRadius: 3,
                        border: `1px solid ${theme.palette.divider}`,
                        display: "flex",
                        flexDirection: "column",
                        height: {
                            xs: "auto",
                            xl: "calc(100vh - 125px)",
                        },
                        minHeight: {
                            xs: 260,
                            xl: 0,
                        },
                        maxHeight: {
                            xs: "none",
                            xl: "calc(100vh - 110px)",
                        },
                        overflow: "hidden",
                        alignSelf: "start",
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
                            {selectedTranscript && selectedTranscriptItemId && (
                                <>
                                    <ExportButton
                                        transcriptId={selectedTranscript.id}
                                        fileName={selectedTranscript.file_name}
                                    />
                                    <DeleteButton
                                        label="Delete"
                                        onDelete={async ({
                                            deleteFromAssembly,
                                            deleteServerFiles,
                                        }) => {
                                            const msg =
                                                await deleteTranscription(
                                                    selectedTranscript.id,
                                                    {
                                                        deleteFromAssembly,
                                                        deleteTxtFile:
                                                            deleteServerFiles,
                                                        deleteAudioFile:
                                                            deleteServerFiles,
                                                    },
                                                );

                                            updateUploadItem(
                                                selectedTranscriptItemId,
                                                (prev) => ({
                                                    ...prev,
                                                    result: undefined,
                                                    error: undefined,
                                                    status: "queued",
                                                    jobId: null,
                                                    stepsState:
                                                        createInitialStepsState(),
                                                }),
                                            );

                                            return msg;
                                        }}
                                    />
                                </>
                            )}

                            {!selectedResultItem?.result &&
                                !activeQueueItem && (
                                    <Tooltip title="Results appear here after transcription">
                                        <IconButton size="small">
                                            <DescriptionOutlinedIcon fontSize="small" />
                                        </IconButton>
                                    </Tooltip>
                                )}
                        </Box>
                    </Box>

                    {selectedResultItem?.result && (
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
                                label={`Model: ${
                                    selectedResultItem.result.options
                                        ?.speech_models?.[0] ??
                                    currentSpeechModel
                                }`}
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
                            display: "flex",
                            flexDirection: "column",
                            minHeight: 0,
                            overflow: "hidden",
                            transition: "opacity 180ms ease",
                            opacity: selectedResultItem?.result ? 1 : 0.98,
                        }}
                    >
                        {!selectedResultItem && !activeQueueItem && (
                            <Box
                                sx={{
                                    border: `1px dashed ${theme.palette.divider}`,
                                    borderRadius: 2,
                                    p: 3,
                                    textAlign: "center",
                                    minHeight: 140,
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
                                    No transcript selected
                                </Typography>
                                <Typography
                                    variant="body2"
                                    sx={{
                                        color: "text.secondary",
                                        maxWidth: 420,
                                    }}
                                >
                                    Add files on the left and select one from
                                    the queue to inspect its status or
                                    transcript.
                                </Typography>
                            </Box>
                        )}

                        {!selectedResultItem?.result && activeQueueItem && (
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
                                    Processing: {activeQueueItem.file.name} —{" "}
                                    {currentStepLabel}
                                </Typography>
                            </Box>
                        )}

                        {selectedResultItem?.status === "failed" && (
                            <Alert
                                severity={
                                    selectedResultItem.jobId
                                        ? "warning"
                                        : "error"
                                }
                                variant="outlined"
                                action={
                                    selectedResultItem.jobId ? (
                                        <Button
                                            color="inherit"
                                            size="small"
                                            onClick={() =>
                                                handleRetryTracking(
                                                    selectedResultItem,
                                                )
                                            }
                                        >
                                            Retry tracking
                                        </Button>
                                    ) : null
                                }
                            >
                                {selectedResultItem.error ||
                                    "This transcription failed."}
                            </Alert>
                        )}

                        {selectedResultItem?.result && (
                            <Box
                                sx={{
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: 1.5,
                                    minHeight: 0,
                                    overflow: "hidden",
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
                                            {
                                                selectedResultItem.result
                                                    .file_name
                                            }
                                        </Typography>
                                        <Typography
                                            variant="body2"
                                            sx={{ color: "text.secondary" }}
                                        >
                                            Category:{" "}
                                            {selectedResultItem.result
                                                .category || "—"}
                                        </Typography>

                                        <Typography
                                            variant="body2"
                                            sx={{ color: "text.secondary" }}
                                        >
                                            Recorded at:{" "}
                                            {selectedResultItem.result
                                                .file_recorded_at
                                                ? formatDateTime(
                                                      selectedResultItem.result
                                                          .file_recorded_at,
                                                  )
                                                : "—"}
                                        </Typography>
                                    </Box>
                                </Box>

                                <Box
                                    sx={{
                                        flex: 1,
                                        minHeight: 0,
                                        overflowY: "hidden",
                                    }}
                                >
                                    <AudioPlayer
                                        src={selectedResultAudioSrc}
                                        onTimeChange={setCurrentTimeSeconds}
                                        onSeek={setCurrentTimeSeconds}
                                        onEnded={() => setCurrentTimeSeconds(0)}
                                    />
                                    <TranscriptText
                                        text={
                                            selectedResultItem.result
                                                .transcription
                                        }
                                        utterances={timing.utterances}
                                        words={timing.words}
                                        activeWordIndex={activeWordIndex}
                                        activeUtteranceIndex={
                                            activeUtteranceIndex
                                        }
                                        highlightActiveWord={hasWordTiming}
                                        highlightActiveSpeakerBlock={
                                            hasUtteranceTiming
                                        }
                                        maxHeight="100%"
                                    />
                                </Box>
                            </Box>
                        )}
                    </Box>
                </Paper>
            </Box>
        </Box>
    );
};
