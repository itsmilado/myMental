// src/features/transcription/pages/OfflineHistoryPage.tsx
import { useNavigate } from "react-router-dom";
import {
    Box,
    Paper,
    CircularProgress,
    Alert,
    Button,
    Typography,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import { useTranscriptionStore } from "../../../store/useTranscriptionStore";
import { useTranscriptionList } from "../hooks/useTranscriptionList";
import { TranscriptionTable } from "../components/TranscriptionTable";
import FilterControls from "../components/FilterControls";

const OfflineHistoryPage = () => {
    const navigate = useNavigate();
    const { list, loading, error, setActive } = useTranscriptionStore();
    const { loadTranscriptions } = useTranscriptionList();
    const handleSync = () => {
        loadTranscriptions();
    };

    return (
        <Paper sx={{ p: 3, borderRadius: 3, position: "relative" }}>
            <Box
                display="flex"
                alignItems="center"
                justifyContent="space-between"
                mb={2}
            >
                <Box fontSize={24} fontWeight={600}>
                    Offline Transcription History
                    <FilterControls />
                </Box>
                <Button
                    startIcon={<RefreshIcon />}
                    onClick={handleSync}
                    disabled={loading}
                    variant="outlined"
                    size="small"
                >
                    {loading ? "Syncing..." : "Sync"}
                </Button>
            </Box>
            <Box display="flex" alignItems="center" mb={2} gap={2}></Box>
            {loading ? (
                <Box display="flex" justifyContent="center" py={5}>
                    <CircularProgress />
                </Box>
            ) : error ? (
                <Alert severity="error">{error}</Alert>
            ) : list.length === 0 ? (
                <Typography
                    color="text.secondary"
                    sx={{ py: 6, textAlign: "center" }}
                >
                    Please sync to load online transcriptions.
                </Typography>
            ) : (
                <TranscriptionTable
                    data={list}
                    loading={loading}
                    error={error}
                    onRowClick={(t) => {
                        setActive(t);
                        navigate(`/dashboard/transcriptions/${t.id}`);
                    }}
                />
            )}
        </Paper>
    );
};

export default OfflineHistoryPage;
