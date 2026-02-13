// src/features/transcription/pages/OfflineHistoryPage.tsx

import { useEffect, useRef, useState } from "react";
import { Box, Paper, CircularProgress, Alert, Typography } from "@mui/material";

import { useTranscriptionStore } from "../../../store/useTranscriptionStore";
import { useTranscriptionList } from "../hooks/useTranscriptionList";
import { TranscriptionTable } from "../components/TranscriptionTable";
import FilterControls from "../components/FilterControls";
import { OfflineTranscriptionModal } from "../components/OfflineTranscriptionModal";

const OfflineHistoryPage = () => {
    const { list, loading, error, setActive, filters, sort } =
        useTranscriptionStore();
    const { loadTranscriptions } = useTranscriptionList();

    const [selected, setSelected] = useState<any | null>(null);

    // Trigger initial data load when the page mounts
    useEffect(() => {
        loadTranscriptions();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Re-fetch when filters or sort change, skipping the initial render
    const didMountRef = useRef(false);

    useEffect(() => {
        if (!didMountRef.current) {
            didMountRef.current = true;
            return;
        }
        loadTranscriptions();
    }, [filters, sort, loadTranscriptions]);

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
            </Box>

            <FilterControls />

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
                    No offline transcriptions found.
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
