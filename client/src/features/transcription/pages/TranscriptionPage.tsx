import {
    Box,
    Button,
    Typography,
    TextField,
    Switch,
    FormControlLabel,
    Paper,
} from "@mui/material";
import { useState } from "react";
import { uploadAudio } from "../../auth/api";
import { TranscriptionOptions, TranscriptData } from "../../../types/types";

const defaultTranscriptionOptions: TranscriptionOptions = {
    speaker_labels: true,
    speakers_expected: 2,
    sentiment_analysis: true,
    speech_model: "default",
    language_code: "en-US",
    format_text: true,
    entity_detection: true,
};

export const TranscriptionPage = () => {
    const [file, setFile] = useState<File | null>(null);
    const [options, setOptions] = useState<TranscriptionOptions>(
        defaultTranscriptionOptions
    );
    const [results, setResults] = useState<TranscriptData | null>(null);
    const [loading, setLoading] = useState(false);

    const handleUpload = async () => {
        if (!file) return;
        setLoading(true);
        try {
            const response = await uploadAudio(file, options);
            setResults(response);
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
            </Box>

            <Button
                variant="contained"
                onClick={handleUpload}
                disabled={!file || loading}
            >
                {loading ? "Transcribing..." : "Upload & Transcribe"}
            </Button>

            {results && (
                <Box>
                    <Typography variant="h6" mt={2}>
                        Transcript
                    </Typography>
                    <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                        {results.transcription}
                    </Typography>
                </Box>
            )}
        </Paper>
    );
};
