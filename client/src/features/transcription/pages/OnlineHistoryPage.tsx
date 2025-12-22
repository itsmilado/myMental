// src/features/transcription/pages/OnlineHistoryPage.tsx

import { useEffect, useMemo, useState } from "react";
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
    Divider,
} from "@mui/material";
import ClearIcon from "@mui/icons-material/Clear";
import RefreshIcon from "@mui/icons-material/Refresh";

import { useAssemblyTranscriptionList } from "../hooks/useAssemblyTranscriptionList";
import { useAssemblyTranscriptionStore } from "../../../store/useAssemblyTranscriptionStore";

import { OnlineTranscriptionTable } from "../components/OnlineTranscriptionTable";
import { OnlineTranscriptionSidebar } from "../components/OnlineTranscriptionSidebar";
import { OnlineTranscription } from "../../../types/types";

import { useTheme } from "@mui/material/styles";
import { tokens } from "../../../theme/theme";

const OnlineHistoryPage = () => {
    const theme = useTheme();
    const colors = tokens(theme.palette.mode);

    const { loadAssemblyTranscriptions } = useAssemblyTranscriptionList();

    const { list, loading, error, searchId, setSearchId } =
        useAssemblyTranscriptionStore();

    const [selected, setSelected] = useState<OnlineTranscription | null>(null);

    useEffect(() => {
        loadAssemblyTranscriptions();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const filteredList = useMemo(() => {
        const q = (searchId ?? "").trim().toLowerCase();
        if (!q) return list;

        return list.filter((t) =>
            (t.transcript_id ?? "").toLowerCase().includes(q)
        );
    }, [list, searchId]);

    const handleRefresh = async () => {
        await loadAssemblyTranscriptions();
    };

    return (
        <Paper
            elevation={0}
            sx={{
                height: "100%",
                display: "flex",
                flexDirection: "column",
                borderRadius: 2,
            }}
        >
            {/* Header */}
            <Box px={2.5} py={2}>
                <Box fontSize={24} fontWeight={600} mb={2}>
                    AssemblyAI Transcription History
                </Box>

                <Box display="flex" alignItems="center" gap={1.5} mb={1}>
                    <TextField
                        size="small"
                        placeholder="Search transcript ID"
                        value={searchId}
                        onChange={(e) => setSearchId(e.target.value)}
                        sx={{ width: 320 }}
                        slotProps={{
                            input: {
                                endAdornment: (
                                    <InputAdornment position="end">
                                        {searchId ? (
                                            <IconButton
                                                size="small"
                                                onClick={() => setSearchId("")}
                                            >
                                                <ClearIcon fontSize="small" />
                                            </IconButton>
                                        ) : null}
                                    </InputAdornment>
                                ),
                            },
                        }}
                    />

                    <Button
                        variant="outlined"
                        size="small"
                        startIcon={<RefreshIcon />}
                        onClick={handleRefresh}
                        disabled={loading}
                        sx={{
                            color: colors.grey[100],
                            borderColor: colors.grey[300],
                            "&:hover": {
                                borderColor: colors.grey[200],
                                backgroundColor: theme.palette.action.hover,
                            },
                        }}
                    >
                        Refresh
                    </Button>
                </Box>
            </Box>

            <Divider />

            {/* Content */}
            <Box flex={1} minHeight={0} mt={2}>
                {loading ? (
                    <Box
                        height="100%"
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                    >
                        <CircularProgress />
                    </Box>
                ) : error ? (
                    <Box p={2}>
                        <Alert severity="error">{error}</Alert>
                    </Box>
                ) : !filteredList.length ? (
                    <Box
                        height="100%"
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                    >
                        <Typography variant="body2" color="text.secondary">
                            {searchId
                                ? "No transcriptions match your search."
                                : "No online transcriptions found."}
                        </Typography>
                    </Box>
                ) : (
                    <OnlineTranscriptionTable
                        data={filteredList}
                        onDetails={setSelected}
                    />
                )}
            </Box>

            {/* Sidebar */}
            <OnlineTranscriptionSidebar
                open={!!selected}
                transcription={selected}
                onClose={() => setSelected(null)}
            />
        </Paper>
    );
};

export default OnlineHistoryPage;
