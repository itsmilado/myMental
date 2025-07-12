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

            <Button variant="outlined" component="label">
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
                />
                <FormControl size="small" fullWidth>
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
                            <MenuItem key={model} value={model}>
                                {model}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>

                <FormControl size="small" fullWidth>
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
                            <MenuItem key={lang} value={lang}>
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
