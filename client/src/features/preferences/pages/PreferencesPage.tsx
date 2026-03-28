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
} from "@mui/material";

import GlobalLoader from "../../../components/global/GlobalLoader";
import DocumentTitle from "../../../components/global/DocumentTitle";

import { usePreferencesStore } from "../../../store/usePreferencesStore";
import type {
    DeepPartial,
    SpeechModel,
    SummaryStyle,
    ThemePreference,
    UserPreferences,
} from "../../../types/types";

const sectionCardSx = {
    p: { xs: 2, md: 3 },
    borderRadius: 3,
};

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
}) => (
    <Paper sx={sectionCardSx}>
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

const PreferencesPage = () => {
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

    useEffect(() => {
        void load();
    }, [load]);

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
    const isUniversal2 = currentModel === "universal-2";
    const isUniversal3Pro = currentModel === "universal-3-pro";

    const currentLanguages = useMemo(
        () => modelLanguages[currentModel] ?? ["en_us"],
        [currentModel],
    );

    const currentLanguageValue =
        (isUniversal2 || isUniversal3Pro) && transcription?.autoDetectLanguage
            ? AUTO_LANGUAGE_CODE
            : (transcription?.language ?? "en_us");

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
                <Alert severity="error">Unable to load preferences.</Alert>
            </Box>
        );
    }

    return (
        <>
            <DocumentTitle title="Preferences" />

            <Box sx={{ maxWidth: 980, mx: "auto", pb: 4 }}>
                <Stack spacing={3}>
                    <Box>
                        <Typography variant="h4" fontWeight={700} gutterBottom>
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
                                                const nextIsUniversal2 =
                                                    nextModel === "universal-2";
                                                const nextIsUniversal3Pro =
                                                    nextModel ===
                                                    "universal-3-pro";

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

                                                const nextAutoDetect =
                                                    nextIsUniversal3Pro ||
                                                    (nextIsUniversal2 &&
                                                        Boolean(
                                                            transcription.autoDetectLanguage,
                                                        ));

                                                void savePatch(
                                                    {
                                                        transcription: {
                                                            ...transcription,
                                                            model: nextModel,
                                                            language:
                                                                nextAutoDetect
                                                                    ? AUTO_LANGUAGE_CODE
                                                                    : fallbackLanguage,
                                                            autoDetectLanguage:
                                                                nextAutoDetect,
                                                            codeSwitching:
                                                                nextIsUniversal2
                                                                    ? transcription.codeSwitching
                                                                    : transcription.codeSwitching,
                                                            formatText:
                                                                nextIsUniversal3Pro
                                                                    ? false
                                                                    : transcription.formatText,
                                                            punctuate:
                                                                nextIsUniversal3Pro
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

                                    <FormControl fullWidth>
                                        <InputLabel id="language-label">
                                            Default language
                                        </InputLabel>
                                        <Select
                                            labelId="language-label"
                                            label="Default language"
                                            value={currentLanguageValue}
                                            disabled={
                                                isUniversal2 &&
                                                transcription.codeSwitching
                                            }
                                            onChange={(e) => {
                                                const nextValue = String(
                                                    e.target.value,
                                                );
                                                const selectingAuto =
                                                    nextValue ===
                                                    AUTO_LANGUAGE_CODE;

                                                void savePatch(
                                                    {
                                                        transcription: {
                                                            ...transcription,
                                                            language: nextValue,
                                                            autoDetectLanguage:
                                                                isUniversal3Pro
                                                                    ? true
                                                                    : isUniversal2 &&
                                                                      selectingAuto,
                                                            codeSwitching:
                                                                isUniversal2 &&
                                                                selectingAuto
                                                                    ? transcription.codeSwitching
                                                                    : transcription.codeSwitching,
                                                        },
                                                    },
                                                    "Default language saved.",
                                                );
                                            }}
                                        >
                                            {isUniversal2 || isUniversal3Pro ? (
                                                <MenuItem
                                                    value={AUTO_LANGUAGE_CODE}
                                                >
                                                    {getLanguageLabel(
                                                        AUTO_LANGUAGE_CODE,
                                                    )}
                                                </MenuItem>
                                            ) : null}

                                            {currentLanguages.map((lang) => (
                                                <MenuItem
                                                    key={lang}
                                                    value={lang}
                                                >
                                                    {getLanguageLabel(lang)}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </Box>

                                <Stack spacing={1} sx={{ mt: 1.5 }}>
                                    <FormControlLabel
                                        control={
                                            <Switch
                                                checked={Boolean(
                                                    transcription.autoDetectLanguage,
                                                )}
                                                onChange={(e) => {
                                                    const checked =
                                                        e.target.checked;

                                                    const fallbackLanguage =
                                                        currentLanguages.find(
                                                            (lang) =>
                                                                lang !==
                                                                AUTO_LANGUAGE_CODE,
                                                        ) ?? "en_us";

                                                    void savePatch(
                                                        {
                                                            transcription: {
                                                                ...transcription,
                                                                autoDetectLanguage:
                                                                    checked,
                                                                language:
                                                                    checked
                                                                        ? AUTO_LANGUAGE_CODE
                                                                        : transcription.language ===
                                                                            AUTO_LANGUAGE_CODE
                                                                          ? fallbackLanguage
                                                                          : transcription.language,
                                                                codeSwitching:
                                                                    checked
                                                                        ? transcription.codeSwitching
                                                                        : false,
                                                            },
                                                        },
                                                        "Automatic language detection updated.",
                                                    );
                                                }}
                                            />
                                        }
                                        label="Enable automatic language detection"
                                    />

                                    <FormControlLabel
                                        control={
                                            <Switch
                                                checked={Boolean(
                                                    transcription.codeSwitching,
                                                )}
                                                disabled={
                                                    !transcription.autoDetectLanguage
                                                }
                                                onChange={(e) => {
                                                    const checked =
                                                        e.target.checked;

                                                    void savePatch(
                                                        {
                                                            transcription: {
                                                                ...transcription,
                                                                codeSwitching:
                                                                    checked,
                                                                autoDetectLanguage:
                                                                    checked
                                                                        ? true
                                                                        : transcription.autoDetectLanguage,
                                                                language:
                                                                    checked
                                                                        ? AUTO_LANGUAGE_CODE
                                                                        : transcription.language,
                                                            },
                                                        },
                                                        "Code switching updated.",
                                                    );
                                                }}
                                            />
                                        }
                                        label="Enable code switching"
                                    />
                                </Stack>
                            </Box>

                            <Box
                                sx={{
                                    display: "grid",
                                    gridTemplateColumns: {
                                        xs: "1fr",
                                        lg: "1fr 1fr",
                                    },
                                    gap: 2,
                                    alignItems: "start",
                                }}
                            >
                                <Box
                                    sx={{
                                        border: "1px solid",
                                        borderColor: "divider",
                                        borderRadius: 2,
                                        p: 2,
                                    }}
                                >
                                    <Typography
                                        variant="subtitle2"
                                        sx={{ mb: 1.5 }}
                                    >
                                        Speaker Diarization
                                    </Typography>

                                    <Stack spacing={1.5}>
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
                                                            "Speaker label default saved.",
                                                        )
                                                    }
                                                />
                                            }
                                            label="Enable speaker labels"
                                        />

                                        <TextField
                                            label="Expected speakers"
                                            type="number"
                                            value={
                                                transcription.speakersExpected
                                            }
                                            disabled={
                                                !transcription.speakerLabels
                                            }
                                            slotProps={{
                                                htmlInput: { min: 1, max: 20 },
                                            }}
                                            onChange={(e) =>
                                                void savePatch(
                                                    {
                                                        transcription: {
                                                            ...transcription,
                                                            speakersExpected:
                                                                Math.max(
                                                                    1,
                                                                    Number.parseInt(
                                                                        e.target
                                                                            .value,
                                                                        10,
                                                                    ) || 1,
                                                                ),
                                                        },
                                                    },
                                                    "Expected speakers saved.",
                                                )
                                            }
                                            helperText={
                                                transcription.speakerLabels
                                                    ? "Used when diarization is enabled."
                                                    : "Enable speaker labels to edit."
                                            }
                                            fullWidth
                                        />
                                    </Stack>
                                </Box>

                                <Box
                                    sx={{
                                        border: "1px solid",
                                        borderColor: "divider",
                                        borderRadius: 2,
                                        p: 2,
                                    }}
                                >
                                    <Typography
                                        variant="subtitle2"
                                        sx={{ mb: 1.5 }}
                                    >
                                        Format Transcription
                                    </Typography>

                                    <Stack spacing={0.5}>
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
                                                            "Punctuation default saved.",
                                                        )
                                                    }
                                                />
                                            }
                                            label="Punctuate"
                                        />

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
                                                            "Format text default saved.",
                                                        )
                                                    }
                                                />
                                            }
                                            label="Format text"
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
                                                            "Disfluencies default saved.",
                                                        )
                                                    }
                                                />
                                            }
                                            label="Include disfluencies"
                                        />
                                    </Stack>
                                </Box>
                            </Box>
                        </Stack>
                    </SettingsSection>

                    <SettingsSection
                        title="Transcript display"
                        description="Control transcript view defaults after transcription is complete."
                    >
                        <Stack spacing={1}>
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
                                                "Transcript speaker display saved.",
                                            )
                                        }
                                    />
                                }
                                label="Show speakers by default"
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
                                                "Transcript timestamp display saved.",
                                            )
                                        }
                                    />
                                }
                                label="Show timestamps by default"
                            />
                        </Stack>
                    </SettingsSection>

                    <SettingsSection
                        title="AI"
                        description="Prepare future post-transcription AI workflows and output formatting."
                        chip="Coming soon"
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
                        <Alert severity="info">
                            Reserve this section for document upload, sharing,
                            and archive defaults.
                        </Alert>
                    </SettingsSection>

                    <SettingsSection
                        title="Tasks"
                        description="Task-related defaults can be added here as task flows become available."
                        chip="Planned"
                    >
                        <Alert severity="info">
                            Reserve this section for task list defaults,
                            assignment views, and completion preferences.
                        </Alert>
                    </SettingsSection>

                    <SettingsSection
                        title="Calendar"
                        description="Calendar display and scheduling defaults can be grouped here later."
                        chip="Planned"
                    >
                        <Alert severity="info">
                            Reserve this section for calendar view defaults,
                            reminders, and event settings.
                        </Alert>
                    </SettingsSection>

                    {error ? <Alert severity="error">{error}</Alert> : null}
                </Stack>

                <Snackbar
                    open={toast.open}
                    autoHideDuration={2200}
                    onClose={() => setToast((t) => ({ ...t, open: false }))}
                    anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                >
                    <Alert
                        severity={toast.severity}
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
