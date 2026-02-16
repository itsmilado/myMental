// src/features/preferences/pages/PreferencesPage.tsx

import { useEffect, useMemo, useState } from "react";
import {
    Box,
    Paper,
    Typography,
    Stack,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Switch,
    FormControlLabel,
    CircularProgress,
    Snackbar,
    Alert,
    Divider,
} from "@mui/material";
import { usePreferencesStore } from "../../../store/usePreferencesStore";
import type { ThemePreference } from "../../../types/types";

const PreferencesPage = () => {
    const { preferences, loading, error, load, patch } = usePreferencesStore();

    const [toast, setToast] = useState<{
        open: boolean;
        msg: string;
        severity: "success" | "error";
    }>({
        open: false,
        msg: "",
        severity: "success",
    });

    useEffect(() => {
        load();
    }, [load]);

    const themeValue = preferences?.appearance.theme ?? "system";

    const modelOptions = useMemo(() => ["slam-1", "nano", "universal-2"], []);
    const languageOptions = useMemo(
        () => [
            { code: "en_us", label: "English (US)" },
            { code: "en_uk", label: "English (UK)" },
            { code: "de", label: "German" },
            { code: "fr", label: "French" },
            { code: "es", label: "Spanish" },
        ],
        [],
    );

    if (loading && !preferences) {
        return (
            <Box
                display="flex"
                justifyContent="center"
                alignItems="center"
                minHeight="50vh"
            >
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box>
            <Typography variant="h4" fontWeight="bold" gutterBottom>
                Preferences
            </Typography>

            <Stack spacing={2}>
                {/* Appearance */}
                <Paper sx={{ p: 3 }}>
                    <Typography variant="h6" fontWeight={700} gutterBottom>
                        Appearance
                    </Typography>

                    <FormControl fullWidth>
                        <InputLabel id="theme-label">Theme</InputLabel>
                        <Select
                            labelId="theme-label"
                            label="Theme"
                            value={themeValue}
                            onChange={async (e) => {
                                const value = e.target.value as ThemePreference;
                                try {
                                    await patch({
                                        appearance: { theme: value },
                                    } as any);
                                    setToast({
                                        open: true,
                                        msg: "Theme preference saved",
                                        severity: "success",
                                    });
                                } catch (err: any) {
                                    setToast({
                                        open: true,
                                        msg: err?.message || "Failed to save",
                                        severity: "error",
                                    });
                                }
                            }}
                        >
                            <MenuItem value="system">System</MenuItem>
                            <MenuItem value="light">Light</MenuItem>
                            <MenuItem value="dark">Dark</MenuItem>
                        </Select>
                    </FormControl>
                </Paper>

                {/* Transcription defaults */}
                <Paper sx={{ p: 3 }}>
                    <Typography variant="h6" fontWeight={700} gutterBottom>
                        Transcription defaults
                    </Typography>

                    <Stack spacing={2}>
                        <FormControl fullWidth>
                            <InputLabel id="model-label">
                                Default model
                            </InputLabel>
                            <Select
                                labelId="model-label"
                                label="Default model"
                                value={
                                    preferences?.transcription.defaultModel ??
                                    "slam-1"
                                }
                                onChange={async (e) => {
                                    try {
                                        await patch({
                                            transcription: {
                                                defaultModel: String(
                                                    e.target.value,
                                                ),
                                            },
                                        } as any);
                                        setToast({
                                            open: true,
                                            msg: "Default model saved",
                                            severity: "success",
                                        });
                                    } catch (err: any) {
                                        setToast({
                                            open: true,
                                            msg:
                                                err?.message ||
                                                "Failed to save",
                                            severity: "error",
                                        });
                                    }
                                }}
                            >
                                {modelOptions.map((m) => (
                                    <MenuItem key={m} value={m}>
                                        {m}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <FormControl fullWidth>
                            <InputLabel id="lang-label">
                                Default language
                            </InputLabel>
                            <Select
                                labelId="lang-label"
                                label="Default language"
                                value={
                                    preferences?.transcription
                                        .defaultLanguageCode ?? "en_us"
                                }
                                onChange={async (e) => {
                                    try {
                                        await patch({
                                            transcription: {
                                                defaultLanguageCode: String(
                                                    e.target.value,
                                                ),
                                            },
                                        } as any);
                                        setToast({
                                            open: true,
                                            msg: "Default language saved",
                                            severity: "success",
                                        });
                                    } catch (err: any) {
                                        setToast({
                                            open: true,
                                            msg:
                                                err?.message ||
                                                "Failed to save",
                                            severity: "error",
                                        });
                                    }
                                }}
                            >
                                {languageOptions.map((l) => (
                                    <MenuItem key={l.code} value={l.code}>
                                        {l.label}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <Divider />

                        <FormControlLabel
                            control={
                                <Switch
                                    checked={
                                        !!preferences?.transcription
                                            .defaultSpeakerLabels
                                    }
                                    onChange={async (e) => {
                                        try {
                                            await patch({
                                                transcription: {
                                                    defaultSpeakerLabels:
                                                        e.target.checked,
                                                },
                                            } as any);
                                            setToast({
                                                open: true,
                                                msg: "Saved",
                                                severity: "success",
                                            });
                                        } catch (err: any) {
                                            setToast({
                                                open: true,
                                                msg:
                                                    err?.message ||
                                                    "Failed to save",
                                                severity: "error",
                                            });
                                        }
                                    }}
                                />
                            }
                            label="Enable speaker labels by default"
                        />

                        <FormControlLabel
                            control={
                                <Switch
                                    checked={
                                        !!preferences?.transcription
                                            .defaultShowSpeakers
                                    }
                                    onChange={async (e) => {
                                        try {
                                            await patch({
                                                transcription: {
                                                    defaultShowSpeakers:
                                                        e.target.checked,
                                                },
                                            } as any);
                                            setToast({
                                                open: true,
                                                msg: "Saved",
                                                severity: "success",
                                            });
                                        } catch (err: any) {
                                            setToast({
                                                open: true,
                                                msg:
                                                    err?.message ||
                                                    "Failed to save",
                                                severity: "error",
                                            });
                                        }
                                    }}
                                />
                            }
                            label="Show speakers in transcript view by default"
                        />

                        <FormControlLabel
                            control={
                                <Switch
                                    checked={
                                        !!preferences?.transcription
                                            .defaultShowTimestamps
                                    }
                                    onChange={async (e) => {
                                        try {
                                            await patch({
                                                transcription: {
                                                    defaultShowTimestamps:
                                                        e.target.checked,
                                                },
                                            } as any);
                                            setToast({
                                                open: true,
                                                msg: "Saved",
                                                severity: "success",
                                            });
                                        } catch (err: any) {
                                            setToast({
                                                open: true,
                                                msg:
                                                    err?.message ||
                                                    "Failed to save",
                                                severity: "error",
                                            });
                                        }
                                    }}
                                />
                            }
                            label="Show timestamps in transcript view by default"
                        />
                    </Stack>
                </Paper>

                {/* AI placeholder */}
                <Paper sx={{ p: 3 }}>
                    <Typography variant="h6" fontWeight={700} gutterBottom>
                        AI (coming soon)
                    </Typography>
                    <Typography color="text.secondary">
                        control auto-summaries, tone, and structured output.
                    </Typography>
                </Paper>

                {error && <Alert severity="error">{error}</Alert>}
            </Stack>

            <Snackbar
                open={toast.open}
                autoHideDuration={2500}
                onClose={() => setToast((t) => ({ ...t, open: false }))}
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            >
                <Alert
                    severity={toast.severity}
                    onClose={() => setToast((t) => ({ ...t, open: false }))}
                >
                    {toast.msg}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default PreferencesPage;
