// src/features/transcription/pages/OnlineHistoryPage.tsx

import { useState } from "react";
import {
    Box,
    Paper,
    CircularProgress,
    Typography,
    Alert,
    TextField,
    IconButton,
    InputAdornment,
    Button,
} from "@mui/material";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import RefreshIcon from "@mui/icons-material/Refresh";
import { useAssemblyTranscriptionStore } from "../../../store/useAssemblyTranscriptionStore";
import { useAssemblyTranscriptionList } from "../hooks/useAssemblyTranscriptionList";
import { OnlineTranscriptionTable } from "../components/OnlineTranscriptionTable";
import { OnlineTranscriptionSidebar } from "../components/OnlineTranscriptionSidebar";
import { OnlineTranscription } from "../../../types/types";
import { useTheme } from "@mui/material/styles";
import { tokens } from "../../../theme/theme";

const OnlineHistoryPage = () => {
    const theme = useTheme();
    const colors = tokens(theme.palette.mode);
    const { list, loading, error, searchId, setSearchId } =
        useAssemblyTranscriptionStore();
    const [selected, setSelected] = useState<OnlineTranscription | null>(null);

    const { loadAssemblyTranscriptions } = useAssemblyTranscriptionList();

    const handleSync = () => {
        loadAssemblyTranscriptions();
    };

    const handleSearch = () => {
        // searchId state already triggers effect in hook
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
                    Online Transcription History
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
            <Box display="flex" alignItems="center" mb={2} gap={2}>
                <TextField
                    size="small"
                    label="Search by Transcript ID"
                    value={searchId}
                    onChange={(e) => setSearchId(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") handleSearch();
                    }}
                    slotProps={{
                        input: {
                            endAdornment: (
                                <InputAdornment position="end">
                                    <IconButton
                                        aria-label="search"
                                        edge="end"
                                        size="small"
                                        onClick={handleSearch}
                                    >
                                        <ChevronRightIcon />
                                    </IconButton>
                                </InputAdornment>
                            ),
                        },
                    }}
                    sx={{ width: 280 }}
                    disabled={loading || !list.length}
                />
            </Box>
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
                <OnlineTranscriptionTable data={list} onDetails={setSelected} />
            )}
            <OnlineTranscriptionSidebar
                open={!!selected}
                transcription={selected}
                onClose={() => setSelected(null)}
            />
        </Paper>
    );
};

export default OnlineHistoryPage;
