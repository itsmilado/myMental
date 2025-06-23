// src/features/transcription/components/OnlineTranscriptionTable.tsx

import { useState } from "react";
import {
    Table,
    TableHead,
    TableRow,
    TableCell,
    TableBody,
    IconButton,
    Tooltip,
    Box,
    Link,
    Button,
    Chip,
    Snackbar,
} from "@mui/material";
import RestoreIcon from "@mui/icons-material/Restore";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { OnlineTranscription } from "../../../types/types";
import { useTranscriptionStore } from "../../../store/useTranscriptionStore"; // offline state
import { useAssemblyTranscriptionStore } from "../../../store/useAssemblyTranscriptionStore";
import { restoreTranscription } from "../../auth/api";

type Props = {
    data: OnlineTranscription[];
    onDetails: (t: OnlineTranscription) => void;
};

export const OnlineTranscriptionTable = ({ data, onDetails }: Props) => {
    const { addTranscription, list } = useTranscriptionStore();
    const { restoredIds = [], setRestored } = useAssemblyTranscriptionStore();
    const [snackbar, setSnackbar] = useState<{
        open: boolean;
        msg: string;
        error: boolean;
    }>({ open: false, msg: "", error: false });

    const [loadingRestore, setLoadingRestore] = useState<string | null>(null);

    const handleIdCopy = (id: string) => {
        navigator.clipboard.writeText(id);
    };

    const handleUrlCopy = (url: string) => {
        navigator.clipboard.writeText(url);
    };

    const isRestored = (transcript_id: string) =>
        !!list.find((t) => t.transcript_id === transcript_id) ||
        restoredIds.includes(transcript_id);

    const handleRestore = async (t: OnlineTranscription) => {
        setLoadingRestore(t.transcript_id);
        try {
            const data = await restoreTranscription({
                transcript_id: t.transcript_id,
                transcription: t.transcription,
                file_recorded_at: t.created_at,
            });
            addTranscription(data);
            setRestored(t.transcript_id);
            setSnackbar({ open: true, msg: "Restored!", error: false });
        } catch (err: any) {
            setSnackbar({
                open: true,
                msg: err.message || "Restore failed",
                error: true,
            });
        } finally {
            setLoadingRestore(null);
        }
    };

    if (!data.length) {
        return <Box p={2}>No online transcriptions found.</Box>;
    }

    return (
        <>
            <Table size="small">
                <TableHead>
                    <TableRow>
                        {/* --- Actions column inserted here --- */}
                        <TableCell>Actions</TableCell>
                        <TableCell>Date</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Transcript ID</TableCell>
                        <TableCell>Audio Length</TableCell>
                        <TableCell>Audio URL</TableCell>
                        <TableCell align="center">Details</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {data.map((t) => (
                        <TableRow key={t.transcript_id} hover>
                            {/* --- Actions cell --- */}
                            <TableCell>
                                <Tooltip
                                    title={
                                        isRestored(t.transcript_id)
                                            ? "Already restored"
                                            : "Restore transcript"
                                    }
                                >
                                    <span>
                                        {!isRestored(t.transcript_id) ? (
                                            <Button
                                                size="small"
                                                startIcon={<RestoreIcon />}
                                                onClick={() => handleRestore(t)}
                                                disabled={!!loadingRestore}
                                            >
                                                {loadingRestore ===
                                                t.transcript_id
                                                    ? "Restoring..."
                                                    : "Restore"}
                                            </Button>
                                        ) : (
                                            <Chip
                                                label="Restored"
                                                color="success"
                                                size="small"
                                            />
                                        )}
                                    </span>
                                </Tooltip>
                            </TableCell>
                            <TableCell>
                                {new Date(t.created_at).toLocaleString()}
                            </TableCell>
                            <TableCell>{t.status}</TableCell>
                            <TableCell>
                                <Box display="flex" alignItems="center">
                                    {t.transcript_id}
                                    <Tooltip title="Copy Transcript ID">
                                        <IconButton
                                            size="small"
                                            onClick={() =>
                                                navigator.clipboard.writeText(
                                                    t.transcript_id
                                                )
                                            }
                                            sx={{ ml: 1 }}
                                        >
                                            <ContentCopyIcon fontSize="small" />
                                        </IconButton>
                                    </Tooltip>
                                </Box>
                            </TableCell>
                            <TableCell>{t.audio_duration || "-"}</TableCell>
                            <TableCell>
                                <Link
                                    href={t.audio_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    underline="hover"
                                >
                                    {t.audio_url}
                                </Link>
                                <Tooltip title="Copy Audio URL">
                                    <IconButton
                                        size="small"
                                        onClick={() =>
                                            navigator.clipboard.writeText(
                                                t.audio_url
                                            )
                                        }
                                        sx={{ ml: 1 }}
                                    >
                                        <ContentCopyIcon fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                            </TableCell>
                            <TableCell align="center">
                                <IconButton
                                    size="small"
                                    onClick={() => onDetails(t)}
                                    aria-label="Show details"
                                >
                                    <ChevronRightIcon />
                                </IconButton>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
            <Snackbar
                open={snackbar.open}
                autoHideDuration={2500}
                onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
                message={snackbar.msg}
                anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
                ContentProps={{
                    sx: snackbar.error ? { backgroundColor: "error.main" } : {},
                }}
            />
        </>
    );
};
