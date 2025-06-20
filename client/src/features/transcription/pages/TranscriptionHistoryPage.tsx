// src/features/transcription/pages/TranscriptionHistoryPage.tsx

import { Box, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useTranscriptionStore } from "../../../store/useTranscriptionStore";
import { useTranscriptionList } from "../hooks/useTranscriptionList";
import { TranscriptionTable } from "../components/TranscriptionTable";
import FilterControls from "../components/FilterControls";

const TranscriptionHistoryPage = () => {
    const navigate = useNavigate();
    const { list, loading, error, setActive } = useTranscriptionStore();

    useTranscriptionList(); // <-- hook auto-fetches

    return (
        <Box sx={{ maxWidth: 1200, margin: "0 auto", py: 4 }}>
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
                    navigate(`/dashboard/transcriptions/${t.id}`);
                }}
            />
        </Box>
    );
};

export default TranscriptionHistoryPage;
