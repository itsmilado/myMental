// src/features/preferences/pages/PreferencesPage.tsx

import { useEffect, useMemo, useState } from "react";
import {
    Alert,
    Box,
    Chip,
    FormControl,
    FormControlLabel,
    InputLabel,
    MenuItem,
    Paper,
    Select,
    Snackbar,
    Stack,
    Switch,
    TextField,
    Typography,
    Divider,
    useTheme,
} from "@mui/material";

import GlobalLoader from "../../../components/global/GlobalLoader";
import DocumentTitle from "../../../components/global/DocumentTitle";
import { appSectionCardSx } from "../../../styles/surfaces";

import { usePreferencesStore } from "../../../store/usePreferencesStore";
import type {
    DeepPartial,
    SpeechModel,
    SummaryStyle,
    ThemePreference,
    UserPreferences,
} from "../../../types/types";

const AUTO_LANGUAGE_CODE = "auto";

const modelOptions: SpeechModel[] = ["universal-3-pro", "universal-2"];

const modelLanguages: Record<SpeechModel, string[]> = {
    "universal-3-pro": ["en", "de", "es", "fr", "it", "pt"],
    "universal-2": [
        "en",
        "en_uk",
        "en_us",
        "en_au",
        "de",
        "fa",
        "ar",
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
    ],
};

const languageLabels: Record<string, string> = {
    [AUTO_LANGUAGE_CODE]: "Automatic Language Detection",
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

const getLanguageLabel = (code: string): string => languageLabels[code] ?? code;

const SettingsSection = ({
    title,
    description,
    children,
    chip,
}: {
    title: string;
    description: string;
    children: React.ReactNode;
    chip?: string;
}) => {
    return (
        <Paper sx={appSectionCardSx}>
            <Stack spacing={2.5}>
                <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={2}
                    alignItems={{ xs: "flex-start", sm: "center" }}
                    justifyContent="space-between"
                >
                    <Box>
                        <Typography variant="h6" fontWeight={700}>
                            {title}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            {description}
                        </Typography>
                    </Box>

                    {chip ? (
                        <Chip label={chip} size="small" variant="outlined" />
                    ) : null}
                </Stack>

                <Divider />

                {children}
            </Stack>
        </Paper>
    );
};

const PreferencesPage = () => {
    const theme = useTheme();
    const { preferences, loading, error, load, patch } = usePreferencesStore();

    const [toast, setToast] = useState<{
        open: boolean;
        message: string;
        severity: "success" | "error";
    }>({
        open: false,
        message: "",
        severity: "success",
    });

    /*
    - purpose: ensure preferences are available when the page is opened directly
    - behavior:
      - loads preferences only when the store is still empty
      - avoids unnecessary reloads after root hydration has already completed
    */
    useEffect(() => {
        if (!preferences) {
            void load();
        }
    }, [preferences, load]);

    const openToast = (message: string, severity: "success" | "error") => {
        setToast({ open: true, message, severity });
    };

    const savePatch = async (
        nextPatch: DeepPartial<UserPreferences>,
        successMessage = "Preferences saved.",
    ) => {
        try {
            await patch(nextPatch);
            openToast(successMessage, "success");
        } catch (e: any) {
            openToast(e?.message || "Failed to save preferences.", "error");
        }
    };

    const themeValue = preferences?.appearance.theme ?? "system";
    const transcription = preferences?.transcription;
    const ai = preferences?.ai;

    const currentModel: SpeechModel = transcription?.model ?? "universal-3-pro";
    const isUniversal3Pro = currentModel === "universal-3-pro";

    const currentLanguages = useMemo(
        () => modelLanguages[currentModel] ?? ["en_us"],
        [currentModel],
    );

    const currentLanguageValue = transcription?.autoDetectLanguage
        ? AUTO_LANGUAGE_CODE
        : (transcription?.language ?? "en_us");

    const languageSelectionDisabled = Boolean(transcription?.codeSwitching);

    if (loading && !preferences) {
        return (
            <>
                <DocumentTitle title="Preferences" />
                <GlobalLoader label="Loading your preferences..." />
            </>
        );
    }

    if (!preferences || !transcription || !ai) {
        return (
            <Box sx={{ maxWidth: 980, mx: "auto", pb: 4 }}>
                <Alert severity="error" variant="outlined">
                    Unable to load preferences.
                </Alert>
            </Box>
        );
    }

    return (
        <>
            <DocumentTitle title="Preferences" />

            <Box sx={{ maxWidth: 980, mx: "auto", pb: 4 }}>
                <Stack spacing={3}>
                    <Box>
                        <Typography
                            variant="h4"
                            color="text.primary"
                            fontWeight={700}
                            gutterBottom
                        >
                            Preferences
                        </Typography>
                        <Typography color="text.secondary">
                            Manage your workspace defaults, transcription
                            behavior, and future feature settings in one place.
                            Upload Audio uses the transcription defaults
                            configured here.
                        </Typography>
                    </Box>

                    <SettingsSection
                        title="Appearance"
                        description="Control how the app looks across your dashboard."
                    >
                        <FormControl fullWidth>
                            <InputLabel id="theme-label">Theme</InputLabel>
                            <Select
                                labelId="theme-label"
                                label="Theme"
                                value={themeValue}
                                onChange={(e) =>
                                    void savePatch(
                                        {
                                            appearance: {
                                                theme: e.target
                                                    .value as ThemePreference,
                                            },
                                        },
                                        "Theme preference saved.",
                                    )
                                }
                            >
                                <MenuItem value="system">System</MenuItem>
                                <MenuItem value="light">Light</MenuItem>
                                <MenuItem value="dark">Dark</MenuItem>
                            </Select>
                        </FormControl>
                    </SettingsSection>

                    <SettingsSection
                        title="Transcription defaults"
                        description="These values initialize Upload Audio when you open the page."
                        chip="Used by Upload Audio"
                    >
                        <Stack spacing={3}>
                            <Box>
                                <Typography
                                    variant="subtitle2"
                                    sx={{ mb: 1.5 }}
                                >
                                    Speech Model and Language
                                </Typography>

                                <Box
                                    sx={{
                                        display: "grid",
                                        gridTemplateColumns: {
                                            xs: "1fr",
                                            md: "1fr 1fr",
                                        },
                                        gap: 2,
                                    }}
                                >
                                    <FormControl fullWidth>
                                        <InputLabel id="model-label">
                                            Default model
                                        </InputLabel>
                                        <Select
                                            labelId="model-label"
                                            label="Default model"
                                            value={currentModel}
                                            onChange={(e) => {
                                                const nextModel = e.target
                                                    .value as SpeechModel;

                                                const nextLanguages =
                                                    modelLanguages[
                                                        nextModel
                                                    ] ?? ["en_us"];

                                                const normalizedCurrentLanguage =
                                                    transcription.language ===
                                                    AUTO_LANGUAGE_CODE
                                                        ? "en_us"
                                                        : transcription.language;

                                                const fallbackLanguage =
                                                    nextLanguages.includes(
                                                        normalizedCurrentLanguage,
                                                    )
                                                        ? normalizedCurrentLanguage
                                                        : nextLanguages[0];

                                                const keepAutomaticLanguage =
                                                    Boolean(
                                                        transcription.codeSwitching,
                                                    ) ||
                                                    Boolean(
                                                        transcription.autoDetectLanguage,
                                                    ) ||
                                                    transcription.language ===
                                                        AUTO_LANGUAGE_CODE;

                                                void savePatch(
                                                    {
                                                        transcription: {
                                                            ...transcription,
                                                            model: nextModel,
                                                            language:
                                                                keepAutomaticLanguage
                                                                    ? AUTO_LANGUAGE_CODE
                                                                    : fallbackLanguage,
                                                            autoDetectLanguage:
                                                                keepAutomaticLanguage,
                                                            codeSwitching:
                                                                Boolean(
                                                                    transcription.codeSwitching,
                                                                ),
                                                            formatText:
                                                                nextModel ===
                                                                "universal-3-pro"
                                                                    ? false
                                                                    : transcription.formatText,
                                                            punctuate:
                                                                nextModel ===
                                                                "universal-3-pro"
                                                                    ? false
                                                                    : transcription.punctuate,
                                                        },
                                                    },
                                                    "Default model saved.",
                                                );
                                            }}
                                        >
                                            {modelOptions.map((model) => (
                                                <MenuItem
                                                    key={model}
                                                    value={model}
                                                >
                                                    {model}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>

                                    <FormControl
                                        fullWidth
                                        disabled={languageSelectionDisabled}
                                    >
                                        <InputLabel id="language-label">
                                            Default language
                                        </InputLabel>
                                        <Select
                                            labelId="language-label"
                                            label="Default language"
                                            value={currentLanguageValue}
                                            onChange={(e) => {
                                                const nextLanguage = e.target
                                                    .value as string;
                                                const useAutomaticLanguage =
                                                    nextLanguage ===
                                                    AUTO_LANGUAGE_CODE;

                                                void savePatch(
                                                    {
                                                        transcription: {
                                                            ...transcription,
                                                            language:
                                                                useAutomaticLanguage
                                                                    ? AUTO_LANGUAGE_CODE
                                                                    : nextLanguage,
                                                            autoDetectLanguage:
                                                                useAutomaticLanguage,
                                                            codeSwitching:
                                                                useAutomaticLanguage
                                                                    ? false
                                                                    : Boolean(
                                                                          transcription.codeSwitching,
                                                                      ),
                                                        },
                                                    },
                                                    "Default language saved.",
                                                );
                                            }}
                                        >
                                            <MenuItem
                                                value={AUTO_LANGUAGE_CODE}
                                            >
                                                {getLanguageLabel(
                                                    AUTO_LANGUAGE_CODE,
                                                )}
                                            </MenuItem>

                                            {currentLanguages.map(
                                                (languageCode) => (
                                                    <MenuItem
                                                        key={languageCode}
                                                        value={languageCode}
                                                    >
                                                        {getLanguageLabel(
                                                            languageCode,
                                                        )}
                                                    </MenuItem>
                                                ),
                                            )}
                                        </Select>
                                    </FormControl>
                                </Box>
                            </Box>

                            <Box
                                sx={{
                                    display: "grid",
                                    gridTemplateColumns: {
                                        xs: "1fr",
                                        md: "1fr 1fr",
                                    },
                                    gap: 2,
                                }}
                            >
                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={Boolean(
                                                transcription.autoDetectLanguage,
                                            )}
                                            onChange={(e) =>
                                                void savePatch(
                                                    {
                                                        transcription: {
                                                            ...transcription,
                                                            autoDetectLanguage:
                                                                e.target
                                                                    .checked,
                                                            language: e.target
                                                                .checked
                                                                ? AUTO_LANGUAGE_CODE
                                                                : transcription.language ===
                                                                    AUTO_LANGUAGE_CODE
                                                                  ? "en_us"
                                                                  : transcription.language,
                                                            codeSwitching: e
                                                                .target.checked
                                                                ? false
                                                                : Boolean(
                                                                      transcription.codeSwitching,
                                                                  ),
                                                        },
                                                    },
                                                    "Language detection preference saved.",
                                                )
                                            }
                                        />
                                    }
                                    label="Automatically detect language"
                                />

                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={Boolean(
                                                transcription.codeSwitching,
                                            )}
                                            onChange={(e) =>
                                                void savePatch(
                                                    {
                                                        transcription: {
                                                            ...transcription,
                                                            codeSwitching:
                                                                e.target
                                                                    .checked,
                                                            autoDetectLanguage:
                                                                e.target.checked
                                                                    ? true
                                                                    : Boolean(
                                                                          transcription.autoDetectLanguage,
                                                                      ),
                                                            language: e.target
                                                                .checked
                                                                ? AUTO_LANGUAGE_CODE
                                                                : transcription.language,
                                                        },
                                                    },
                                                    "Code switching preference saved.",
                                                )
                                            }
                                        />
                                    }
                                    label="Allow code switching"
                                />
                            </Box>

                            <Box
                                sx={{
                                    display: "grid",
                                    gridTemplateColumns: {
                                        xs: "1fr",
                                        md: "1fr 1fr",
                                    },
                                    gap: 2,
                                }}
                            >
                                <TextField
                                    label="Expected speakers"
                                    type="number"
                                    value={transcription.speakersExpected ?? 2}
                                    onChange={(e) =>
                                        void savePatch(
                                            {
                                                transcription: {
                                                    ...transcription,
                                                    speakersExpected: Number(
                                                        e.target.value,
                                                    ),
                                                },
                                            },
                                            "Speaker count saved.",
                                        )
                                    }
                                    inputProps={{ min: 1, max: 10 }}
                                />

                                <TextField
                                    label="Prompt"
                                    value={transcription.prompt ?? ""}
                                    onChange={(e) =>
                                        void savePatch(
                                            {
                                                transcription: {
                                                    ...transcription,
                                                    prompt: e.target.value,
                                                },
                                            },
                                            "Prompt saved.",
                                        )
                                    }
                                    placeholder="Optional transcription guidance"
                                />
                            </Box>

                            <Box
                                sx={{
                                    display: "grid",
                                    gridTemplateColumns: {
                                        xs: "1fr",
                                        md: "1fr 1fr",
                                    },
                                    gap: 2,
                                }}
                            >
                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={Boolean(
                                                transcription.formatText,
                                            )}
                                            disabled={isUniversal3Pro}
                                            onChange={(e) =>
                                                void savePatch(
                                                    {
                                                        transcription: {
                                                            ...transcription,
                                                            formatText:
                                                                e.target
                                                                    .checked,
                                                        },
                                                    },
                                                    "Format text preference saved.",
                                                )
                                            }
                                        />
                                    }
                                    label="Format transcript text"
                                />

                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={Boolean(
                                                transcription.punctuate,
                                            )}
                                            disabled={isUniversal3Pro}
                                            onChange={(e) =>
                                                void savePatch(
                                                    {
                                                        transcription: {
                                                            ...transcription,
                                                            punctuate:
                                                                e.target
                                                                    .checked,
                                                        },
                                                    },
                                                    "Punctuation preference saved.",
                                                )
                                            }
                                        />
                                    }
                                    label="Add punctuation"
                                />

                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={Boolean(
                                                transcription.disfluencies,
                                            )}
                                            onChange={(e) =>
                                                void savePatch(
                                                    {
                                                        transcription: {
                                                            ...transcription,
                                                            disfluencies:
                                                                e.target
                                                                    .checked,
                                                        },
                                                    },
                                                    "Disfluency preference saved.",
                                                )
                                            }
                                        />
                                    }
                                    label="Include disfluencies"
                                />

                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={Boolean(
                                                transcription.speakerLabels,
                                            )}
                                            onChange={(e) =>
                                                void savePatch(
                                                    {
                                                        transcription: {
                                                            ...transcription,
                                                            speakerLabels:
                                                                e.target
                                                                    .checked,
                                                        },
                                                    },
                                                    "Speaker label preference saved.",
                                                )
                                            }
                                        />
                                    }
                                    label="Show speaker labels"
                                />
                            </Box>
                        </Stack>
                    </SettingsSection>

                    <SettingsSection
                        title="Transcript display"
                        description="Set how transcripts should display by default across history and detail views."
                    >
                        <Box
                            sx={{
                                display: "grid",
                                gridTemplateColumns: {
                                    xs: "1fr",
                                    md: "1fr 1fr",
                                },
                                gap: 2,
                            }}
                        >
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={Boolean(
                                            transcription.showSpeakers,
                                        )}
                                        onChange={(e) =>
                                            void savePatch(
                                                {
                                                    transcription: {
                                                        ...transcription,
                                                        showSpeakers:
                                                            e.target.checked,
                                                    },
                                                },
                                                "Transcript display preference saved.",
                                            )
                                        }
                                    />
                                }
                                label="Show speakers in transcript views"
                            />

                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={Boolean(
                                            transcription.showTimestamps,
                                        )}
                                        onChange={(e) =>
                                            void savePatch(
                                                {
                                                    transcription: {
                                                        ...transcription,
                                                        showTimestamps:
                                                            e.target.checked,
                                                    },
                                                },
                                                "Timestamp display preference saved.",
                                            )
                                        }
                                    />
                                }
                                label="Show timestamps in transcript views"
                            />
                        </Box>
                    </SettingsSection>

                    <SettingsSection
                        title="AI"
                        description="Configure AI-powered defaults and follow-up actions."
                    >
                        <Box
                            sx={{
                                display: "grid",
                                gridTemplateColumns: {
                                    xs: "1fr",
                                    md: "1fr 1fr",
                                },
                                gap: 2,
                            }}
                        >
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={Boolean(
                                            ai.autoSummarizeAfterTranscription,
                                        )}
                                        onChange={(e) =>
                                            void savePatch(
                                                {
                                                    ai: {
                                                        ...ai,
                                                        autoSummarizeAfterTranscription:
                                                            e.target.checked,
                                                    },
                                                },
                                                "AI summary preference saved.",
                                            )
                                        }
                                    />
                                }
                                label="Auto-summarize after transcription"
                            />

                            <FormControl fullWidth>
                                <InputLabel id="summary-style-label">
                                    Summary style
                                </InputLabel>
                                <Select
                                    labelId="summary-style-label"
                                    label="Summary style"
                                    value={ai.summaryStyle}
                                    onChange={(e) =>
                                        void savePatch(
                                            {
                                                ai: {
                                                    ...ai,
                                                    summaryStyle: e.target
                                                        .value as SummaryStyle,
                                                },
                                            },
                                            "Summary style saved.",
                                        )
                                    }
                                >
                                    <MenuItem value="concise">Concise</MenuItem>
                                    <MenuItem value="bullet">Bullet</MenuItem>
                                    <MenuItem value="detailed">
                                        Detailed
                                    </MenuItem>
                                </Select>
                            </FormControl>
                        </Box>
                    </SettingsSection>

                    <SettingsSection
                        title="Documents"
                        description="Document defaults will live here once document workflows are enabled."
                        chip="Planned"
                    >
                        <Alert severity="info" variant="outlined">
                            Reserve this section for document upload, sharing,
                            and archive defaults.
                        </Alert>
                    </SettingsSection>

                    <SettingsSection
                        title="Tasks"
                        description="Task-related defaults can be added here as task flows become available."
                        chip="Planned"
                    >
                        <Alert severity="info" variant="outlined">
                            Reserve this section for task list defaults,
                            assignment views, and completion preferences.
                        </Alert>
                    </SettingsSection>

                    <SettingsSection
                        title="Calendar"
                        description="Calendar display and scheduling defaults can be grouped here later."
                        chip="Planned"
                    >
                        <Alert severity="info" variant="outlined">
                            Reserve this section for calendar view defaults,
                            reminders, and event settings.
                        </Alert>
                    </SettingsSection>

                    {error ? (
                        <Alert severity="error" variant="outlined">
                            {error}
                        </Alert>
                    ) : null}
                </Stack>

                <Snackbar
                    open={toast.open}
                    autoHideDuration={2200}
                    onClose={() => setToast((t) => ({ ...t, open: false }))}
                    anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                >
                    <Alert
                        severity={toast.severity}
                        variant={
                            theme.palette.mode === "dark"
                                ? "filled"
                                : "outlined"
                        }
                        onClose={() => setToast((t) => ({ ...t, open: false }))}
                    >
                        {toast.message}
                    </Alert>
                </Snackbar>
            </Box>
        </>
    );
};

export default PreferencesPage;
