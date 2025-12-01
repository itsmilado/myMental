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
} from "@mui/material";
import { useState } from "react";
import { uploadAudio } from "../../auth/api";
import { TranscriptionOptions, TranscriptData } from "../../../types/types";
import { formatDateTime } from "../../../utils/formatDate";
import { useTheme } from "@mui/material/styles";
import { tokens } from "../../../theme/theme";

const defaultTranscriptionOptions: TranscriptionOptions = {
    speaker_labels: false,
    speakers_expected: 2,
    sentiment_analysis: false,
    speech_model: "slam-1",
    language_code: "en-US",
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
        defaultTranscriptionOptions
    );
    const [results, setResults] = useState<TranscriptData | null>(null);
    const [loading, setLoading] = useState(false);

    const handleUpload = async () => {
        if (!file) return;
        setLoading(true);
        const userOptions: Partial<TranscriptionOptions> = {};
        if (options.speaker_labels) userOptions.speaker_labels = true;
        if (options.sentiment_analysis) userOptions.sentiment_analysis = true;
        if (options.entity_detection) userOptions.entity_detection = true;
        if (options.punctuate) userOptions.punctuate = true;
        if (options.format_text) userOptions.format_text = true;
        if (options.speakers_expected !== 2) {
            userOptions.speakers_expected = options.speakers_expected;
        }
        userOptions.speech_model = options.speech_model;
        userOptions.language_code = options.language_code;

        try {
            console.log("userOptions:", userOptions);

            const response = await uploadAudio(file, userOptions);
            setResults(response.TranscriptData);
        } catch (err) {
            console.error("Upload error:", err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Paper sx={{ p: 4, display: "flex", flexDirection: "column", gap: 2 }}>
            <Typography variant="h5">Transcribe Audio</Typography>

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
                    <Typography variant="h6" mt={2} mb={2}>
                        {results.file_name}
                    </Typography>
                    <Typography variant="body2" mb={2}>
                        Recorded at: {formatDateTime(results.file_recorded_at)}
                    </Typography>
                    <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                        {results.transcription}
                    </Typography>
                </Box>
            )}
        </Paper>
    );
};
