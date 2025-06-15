import {
    Box,
    Typography,
    List,
    ListItem,
    ListItemText,
    CircularProgress,
    Alert,
    Paper,
} from "@mui/material";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranscriptionStore } from "../../../store/useTranscriptionStore";
import { useTranscriptionList } from "../hooks/useTranscriptionList";

const TranscriptionHistoryPage = () => {
    const navigate = useNavigate();
    const { list, loading, error, setActive } = useTranscriptionStore();
    const { loadTranscriptions } = useTranscriptionList();

    useEffect(() => {
        loadTranscriptions();
    }, [loadTranscriptions]);

    return (
        <Box sx={{ maxWidth: 600, margin: "0 auto", py: 4 }}>
            <Typography variant="h4" gutterBottom>
                Transcription History
            </Typography>
            <Paper sx={{ p: 2, borderRadius: 3 }}>
                {loading && (
                    <Box display="flex" justifyContent="center" my={3}>
                        <CircularProgress />
                    </Box>
                )}
                {error && <Alert severity="error">{error}</Alert>}
                {!loading &&
                    !error &&
                    (list.length > 0 ? (
                        <List>
                            {list.map((t) => (
                                <ListItem
                                    component="button"
                                    key={t.transcript_id}
                                    onClick={() => {
                                        setActive(t); //set the active transcription in zustand
                                        navigate(
                                            `/dashboard/transcriptions/${t.id}` //navigate to the transcription detail page
                                        );
                                    }}
                                    divider
                                >
                                    <ListItemText
                                        primary={t.file_name}
                                        secondary={
                                            <>
                                                <Typography
                                                    component="span"
                                                    variant="body2"
                                                >
                                                    Database ID: {t.id}
                                                </Typography>
                                                <br />
                                                <Typography
                                                    component="span"
                                                    variant="body2"
                                                >
                                                    API ID: {t.transcript_id}
                                                </Typography>
                                                <br />
                                                <Typography
                                                    component="span"
                                                    variant="caption"
                                                >
                                                    Date: {t.file_recorded_at}
                                                </Typography>
                                            </>
                                        }
                                    />
                                </ListItem>
                            ))}
                        </List>
                    ) : (
                        <Typography color="text.secondary">
                            No transcriptions found.
                        </Typography>
                    ))}
            </Paper>
        </Box>
    );
};

export default TranscriptionHistoryPage;
