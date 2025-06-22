// src/features/transcription/pages/OnlineHistoryPage.tsx

import { useEffect, useState } from "react";
import {
    Box,
    Paper,
    CircularProgress,
    Typography,
    Alert,
    TextField,
    IconButton,
    InputAdornment,
} from "@mui/material";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { useAssemblyTranscriptionStore } from "../../../store/useAssemblyTranscriptionStore";
import { useAssemblyTranscriptionList } from "../hooks/useAssemblyTranscriptionList";
import { OnlineTranscriptionTable } from "../components/OnlineTranscriptionTable";
import { OnlineTranscriptionSidebar } from "../components/OnlineTranscriptionSidebar";
import { OnlineTranscription } from "../../../types/types";

const OnlineHistoryPage = () => {
    const { list, loading, error, searchId, setSearchId } =
        useAssemblyTranscriptionStore();
    const [selected, setSelected] = useState<OnlineTranscription | null>(null);

    useAssemblyTranscriptionList();

    const handleSearch = () => {
        // searchId state already triggers effect in hook
    };

    return (
        <Paper sx={{ p: 3, borderRadius: 3, position: "relative" }}>
            <Box mb={2} fontSize={24} fontWeight={600}>
                Online Transcription History
            </Box>
            <Box display="flex" alignItems="center" mb={2} gap={2}>
                <TextField
                    size="small"
                    label="Transcript ID"
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
                />
            </Box>
            {loading ? (
                <Box display="flex" justifyContent="center" py={5}>
                    <CircularProgress />
                </Box>
            ) : error ? (
                <Alert severity="error">{error}</Alert>
            ) : list.length === 0 ? (
                <Typography color="text.secondary">
                    No online transcriptions found.
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
