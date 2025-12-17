// src/features/transcription/pages/OfflineHistoryPage.tsx
// import { useNavigate } from "react-router-dom";
import { useState } from "react";
import {
    Box,
    Paper,
    CircularProgress,
    Alert,
    Button,
    Typography,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import { useTheme } from "@mui/material/styles";
import { tokens } from "../../../theme/theme";
import { useTranscriptionStore } from "../../../store/useTranscriptionStore";
import { useTranscriptionList } from "../hooks/useTranscriptionList";
import { TranscriptionTable } from "../components/TranscriptionTable";
import FilterControls from "../components/FilterControls";
import { OfflineTranscriptionModal } from "../components/OfflineTranscriptionModal";

const OfflineHistoryPage = () => {
    const theme = useTheme();
    const colors = tokens(theme.palette.mode);
    // const navigate = useNavigate();
    const { list, loading, error, setActive } = useTranscriptionStore();
    const { loadTranscriptions } = useTranscriptionList();

    const [selected, setSelected] = useState<any | null>(null);

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
                </Box>
                <Button
                    startIcon={<RefreshIcon />}
                    onClick={handleSync}
                    disabled={loading}
                    variant="outlined"
                    size="small"
                    sx={{
                        color: colors.grey[100],
                        borderColor: colors.grey[300],
                        "&:hover": {
                            borderColor: colors.grey[200],
                            backgroundColor: theme.palette.action.hover,
                        },
                    }}
                >
                    {loading ? "Syncing..." : "Sync"}
                </Button>
            </Box>
            <FilterControls />
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
                        setSelected(t);
                    }}
                />
            )}
            <OfflineTranscriptionModal
                open={!!selected}
                transcription={selected}
                onClose={() => setSelected(null)}
            />
        </Paper>
    );
};

export default OfflineHistoryPage;
