// src/features/transcription/pages/OfflineHistoryPage.tsx

import { useNavigate } from "react-router-dom";
import { Typography } from "@mui/material";
import { useTranscriptionStore } from "../../../store/useTranscriptionStore";
import { useTranscriptionList } from "../hooks/useTranscriptionList";
import { TranscriptionTable } from "../components/TranscriptionTable";
import FilterControls from "../components/FilterControls";
import { useEffect } from "react";

const OfflineHistoryPage = () => {
    const navigate = useNavigate();
    const { list, loading, error, setActive } = useTranscriptionStore();
    const { loadTranscriptions } = useTranscriptionList();

    useEffect(() => {
        loadTranscriptions();
    }, [loadTranscriptions]);

    return (
        <>
            <Typography variant="h4" gutterBottom>
                Offline Transcription History
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
        </>
    );
};

export default OfflineHistoryPage;
