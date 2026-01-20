// src/features/transcription/pages/TranscriptionDetailPage.tsx

import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Box, CircularProgress, Snackbar, Alert } from "@mui/material";

import { useTranscriptionStore } from "../../../store/useTranscriptionStore";
import { deleteTranscription, fetchTranscriptionById } from "../../auth/api";
import { TranscriptionDetailContent } from "../components/TranscriptionDetailContent";

import type { TranscriptData } from "../../../types/types";

const TranscriptionDetailPage = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();

    const { list, loading, setActive, removeTranscriptionFromList } =
        useTranscriptionStore();

    const [transcription, setTranscription] = useState<TranscriptData | null>(
        null,
    );

    const [snackbar, setSnackbar] = useState<{
        open: boolean;
        message: string;
        error?: boolean;
    }>({ open: false, message: "" });

    /**
     * Resolve transcription from store by route id
     */
    useEffect(() => {
        if (!id) return;

        const found = list.find((t) => String(t.id) === String(id));

        if (found) {
            setActive(found);
            setTranscription(found);
            return;
        }

        // If not in store (common on refresh), fetch by id
        (async () => {
            try {
                const data = await fetchTranscriptionById(id);

                setActive(data);
                setTranscription(data);
            } catch {
                setActive(null);
                navigate("/dashboard/transcriptions/history");
            }
        })();
    }, [id, list, navigate, setActive]);

    /**
     * If item disappears (deleted / refreshed), leave the page
     */
    useEffect(() => {
        if (!id || !transcription) return;

        // On refresh, list can be empty (not yet loaded). Don't redirect in that case.
        if (list.length === 0) return;

        const stillExists = list.some((t) => String(t.id) === String(id));

        if (!stillExists) {
            setActive(null);
            navigate("/dashboard/transcriptions/history");
        }
    }, [list, id, transcription, navigate, setActive]);

    /**
     * DELETE handler
     */
    const handleDelete = async ({
        deleteFromAssembly,
        deleteServerFiles,
    }: {
        deleteFromAssembly: boolean;
        deleteServerFiles: boolean;
        deleteFromDb: boolean;
    }): Promise<string> => {
        try {
            const msg = await deleteTranscription(transcription!.id, {
                deleteFromAssembly,
                deleteTxtFile: deleteServerFiles,
                deleteAudioFile: deleteServerFiles,
            });

            removeTranscriptionFromList(transcription!.id);

            setSnackbar({
                open: true,
                message: msg || "Deleted",
                error: false,
            });

            setActive(null);
            navigate("/dashboard/transcriptions/history");

            return msg || "Deleted";
        } catch (error: any) {
            const failMsg = error?.message || "Delete failed";
            setSnackbar({ open: true, message: failMsg, error: true });
            throw error;
        }
    };

    /**
     * Loading state
     */
    if (loading || !transcription) {
        return (
            <Box
                display="flex"
                justifyContent="center"
                alignItems="center"
                minHeight={300}
            >
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box sx={{ py: 2 }}>
            <TranscriptionDetailContent
                // mode="page"
                transcription={transcription}
                showActions={true}
                onBack={() => {
                    setActive(null);
                    navigate("/dashboard/transcriptions/history/offline");
                }}
                onClose={() => {
                    setActive(null);
                    navigate("/dashboard/transcriptions/history/offline");
                }}
                onOpenFullPage={undefined}
                onDelete={handleDelete}
            />

            <Snackbar
                open={snackbar.open}
                autoHideDuration={2500}
                onClose={() => setSnackbar({ ...snackbar, open: false })}
                anchorOrigin={{
                    vertical: "bottom",
                    horizontal: "right",
                }}
            >
                <Alert
                    onClose={() => setSnackbar({ ...snackbar, open: false })}
                    severity={snackbar.error ? "error" : "success"}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default TranscriptionDetailPage;
