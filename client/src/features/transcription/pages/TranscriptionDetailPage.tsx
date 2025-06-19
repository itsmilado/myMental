// src/features/transcription/pages/TranscriptionDetailPage.tsx

import { useParams, useNavigate } from "react-router-dom";
import {
    Box,
    Typography,
    Button,
    Paper,
    IconButton,
    Stack,
} from "@mui/material";
import { useTranscriptionStore } from "../../../store/useTranscriptionStore";
import { ExportButton } from "../components/ExportButton";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CloseIcon from "@mui/icons-material/Close";

const TranscriptionDetailPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { list, active, setActive } = useTranscriptionStore();

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
                            navigate(-1);
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
                        <ExportButton
                            transcriptId={active.id}
                            fileName={active.file_name}
                        />
                    )}
                </Stack>
                <Typography variant="body2" gutterBottom>
                    Recorded at: {transcription.file_recorded_at}
                </Typography>
                {/* <Stack direction="row" spacing={1} mb={2}>
                    {transcription.speaker_labels && (
                        <Chip label="Speaker Labels" />
                    )}
                    {transcription.sentiment_analysis && (
                        <Chip label="Sentiment" />
                    )}
                    {transcription.entity_detection && (
                        <Chip label="Entities" />
                    )}
                    {transcription.speech_model && (
                        <Chip label={`Model: ${transcription.speech_model}`} />
                    )}
                    {transcription.language_code && (
                        <Chip label={`Lang: ${transcription.language_code}`} />
                    )}
                    {transcription.status && (
                        <Chip
                            label={transcription.status}
                            color={
                                transcription.status === "completed"
                                    ? "success"
                                    : transcription.status === "failed"
                                    ? "error"
                                    : "warning"
                            }
                        />
                    )}
                </Stack> */}
                <Typography variant="subtitle2" sx={{ mt: 2 }}>
                    Transcription:
                </Typography>
                <Typography sx={{ whiteSpace: "pre-wrap", mt: 1 }}>
                    {transcription.transcription}
                </Typography>
            </Paper>
        </Box>
    );
};

export default TranscriptionDetailPage;
