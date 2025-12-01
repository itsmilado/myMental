// src/features/transcription/pages/TranscriptionDetailPage.tsx

import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
    Box,
    Divider,
    Chip,
    Typography,
    Button,
    Paper,
    IconButton,
    Stack,
    Snackbar,
    Alert,
} from "@mui/material";
import { useTranscriptionStore } from "../../../store/useTranscriptionStore";
import { ExportButton } from "../components/ExportButton";
import { DeleteButton } from "../components/DeleteButton";
import { deleteTranscription } from "../../auth/api";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CloseIcon from "@mui/icons-material/Close";
import { TranscriptionOptions } from "../../../types/types";
import { useTheme } from "@mui/material/styles";
import { tokens } from "../../../theme/theme";

const TranscriptionDetailPage = () => {
    const theme = useTheme();
    const colors = tokens(theme.palette.mode);
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { list, active, setActive, removeTranscriptionFromList } =
        useTranscriptionStore();

    const [snackbar, setSnackbar] = useState<{
        open: boolean;
        message: string;
        error?: boolean;
    }>({ open: false, message: "" });

    // Find the transcription with the given id
    const transcription = active || list.find((t) => t.transcript_id === id);

    if (!transcription) {
        return (
            <Box p={3}>
                <Typography variant="h4" color="error">
                    Transcription not found
                </Typography>
                <Button
                    startIcon={<ArrowBackIcon />}
                    onClick={() => {
                        setActive(null);
                        navigate(-1);
                    }}
                >
                    back
                </Button>
                <IconButton
                    onClick={() => {
                        setActive(null);
                        navigate("/dashboard/transcriptions/history");
                    }}
                    size="large"
                    aria-label="close"
                >
                    <CloseIcon />
                </IconButton>
            </Box>
        );
    }

    const { options, audio_duration } = transcription;

    const featureChips: { label: string; key: keyof TranscriptionOptions }[] = [
        { label: "Speaker Labels", key: "speaker_labels" },
        { label: "Speakers Expected", key: "speakers_expected" },
        { label: "Sentiment Analysis", key: "sentiment_analysis" },
        { label: "Speech Model", key: "speech_model" },
        { label: "Language Code", key: "language_code" },
        { label: "Punctuate", key: "punctuate" },
        { label: "Format Text", key: "format_text" },
        { label: "Entity Detection", key: "entity_detection" },
    ];

    // Delete handler
    const handleDelete = async () => {
        try {
            const msg = await deleteTranscription(transcription.id);
            removeTranscriptionFromList(transcription.id);
            setSnackbar({ open: true, message: msg });
            // Navigate AFTER success, and DO NOT call setActive(null)
            navigate("/dashboard/transcriptions/history", { replace: true });
            return msg;
        } catch (error: any) {
            setSnackbar({
                open: true,
                message: error.message || "Delete failed",
                error: true,
            });
            throw error;
        }
    };
    const formatDuration = (dur: any): string => {
        if (!dur) return "";
        if (typeof dur === "string") return dur;
        const h = String(dur.hours ?? 0).padStart(2, "0");
        const m = String(dur.minutes ?? 0).padStart(2, "0");
        const s = String(Math.floor(dur.seconds ?? 0)).padStart(2, "0");
        return `${h}:${m}:${s}`;
    };
    return (
        <Box sx={{ maxWidth: 1000, mx: "auto", py: 4 }}>
            <Paper sx={{ p: 3, borderRadius: 3 }}>
                <Box
                    display="flex"
                    justifyContent="space-between"
                    alignItems="center"
                    mb={2}
                >
                    <Button
                        startIcon={<ArrowBackIcon />}
                        onClick={() => {
                            setActive(null);
                            navigate("/dashboard/transcriptions/history");
                        }}
                        sx={{
                            color: colors.grey[100],
                            borderColor: colors.grey[300],
                            "&:hover": {
                                borderColor: colors.grey[200],
                                backgroundColor: theme.palette.action.hover,
                            },
                        }}
                    >
                        Back
                    </Button>
                    <IconButton
                        onClick={() => {
                            setActive(null);
                            navigate("/dashboard/transcriptions/history");
                        }}
                        size="large"
                        aria-label="close"
                    >
                        <CloseIcon />
                    </IconButton>
                </Box>
                <Stack direction="row" spacing={2} alignItems="center" mb={2}>
                    <Typography variant="h5" gutterBottom>
                        {transcription.file_name}
                    </Typography>
                    <Typography
                        variant="body2"
                        color="text.secondary"
                        gutterBottom
                    >
                        ID (DB): {transcription.id}
                    </Typography>
                    <Typography
                        variant="body2"
                        color="text.secondary"
                        gutterBottom
                    >
                        API ID (AssemblyAI): {transcription.transcript_id}
                    </Typography>

                    {active && (
                        <>
                            <ExportButton
                                transcriptId={active.id}
                                fileName={active.file_name}
                            />
                            <DeleteButton onDelete={handleDelete} />
                        </>
                    )}
                </Stack>
                <>
                    <Typography variant="body2" gutterBottom>
                        Audio Duration: {formatDuration(audio_duration) || "-"}
                    </Typography>
                    <Typography variant="body2" gutterBottom>
                        Language: {options?.language_code || "-"}
                    </Typography>
                    <Typography variant="body2" gutterBottom>
                        Speech Model: {options?.speech_model || "-"}
                    </Typography>
                    <Typography variant="body2" gutterBottom>
                        Speaker Labels: {options?.speaker_labels ? "True" : "-"}
                    </Typography>
                    <Typography variant="body2" gutterBottom>
                        Speakers Expected: {options?.speakers_expected || "-"}
                    </Typography>
                    <Typography variant="body2" gutterBottom>
                        Entity Detection:{" "}
                        {options?.entity_detection ? "True" : "-"}
                    </Typography>
                    <Typography variant="body2" gutterBottom>
                        Sentiment Analysis:{" "}
                        {options?.sentiment_analysis ? "True" : "-"}
                    </Typography>
                    <Typography variant="body2" gutterBottom>
                        Format Text: {options?.format_text ? "True" : "-"}
                    </Typography>
                    <Typography variant="body2" gutterBottom>
                        Punctuate: {options?.punctuate ? "True" : "-"}
                    </Typography>
                    <Typography variant="body2" gutterBottom>
                        Recorded at: {transcription.file_recorded_at}
                    </Typography>

                    <Divider sx={{ mb: 2 }} />
                </>

                <Typography variant="subtitle2" sx={{ mt: 2 }}>
                    Transcription:
                </Typography>
                <Typography sx={{ whiteSpace: "pre-wrap", mt: 1 }}>
                    {transcription.transcription}
                </Typography>
            </Paper>
            <Snackbar
                open={snackbar.open}
                autoHideDuration={2500}
                onClose={() => setSnackbar({ ...snackbar, open: false })}
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            >
                <Alert
                    onClose={() => setSnackbar({ ...snackbar, open: false })}
                    severity={snackbar.error ? "error" : "success"}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default TranscriptionDetailPage;
