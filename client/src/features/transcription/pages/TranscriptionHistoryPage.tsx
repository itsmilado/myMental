// src/features/transcription/pages/TranscriptionHistoryPage.tsx

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
import { TranscriptionTable } from "../components/TranscriptionTable";
import FilterControls from "../components/FilterControls";

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
            <FilterControls />
            <TranscriptionTable
                data={list}
                loading={loading}
                error={error}
                onRowClick={(t) => {
                    setActive(t);
                    navigate(`/dashboard/transcriptions/${t.transcript_id}`);
                }}
            />
        </Box>
    );
};

export default TranscriptionHistoryPage;
