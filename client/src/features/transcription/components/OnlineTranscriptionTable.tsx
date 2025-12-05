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
    Button,
    Chip,
    Snackbar,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
} from "@mui/material";
import RestoreIcon from "@mui/icons-material/Restore";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import DeleteIcon from "@mui/icons-material/Delete";
import { OnlineTranscription } from "../../../types/types";
import { useTranscriptionStore } from "../../../store/useTranscriptionStore"; // offline state
import { useAssemblyTranscriptionStore } from "../../../store/useAssemblyTranscriptionStore";
import { restoreTranscription } from "../../auth/api";
import { deleteAssemblyTranscription } from "../../auth/api";
import { useTheme } from "@mui/material/styles";
import { tokens } from "../../../theme/theme";

type Props = {
    data: OnlineTranscription[];
    onDetails: (t: OnlineTranscription) => void;
};

export const OnlineTranscriptionTable = ({ data, onDetails }: Props) => {
    const theme = useTheme();
    const colors = tokens(theme.palette.mode);
    // Offline (restored) list
    const { addTranscription, list: offlineList } = useTranscriptionStore();
    // Online/assembly state
    const {
        list: onlineList,
        setList: setOnlineList,
        restoredIds = [],
        setRestored,
    } = useAssemblyTranscriptionStore();

    // Local state for snackbar, restore, delete
    const [snackbar, setSnackbar] = useState<{
        open: boolean;
        msg: string;
        error: boolean;
    }>({ open: false, msg: "", error: false });

    const [loadingRestore, setLoadingRestore] = useState<string | null>(null);
    const [deleteDialog, setDeleteDialog] = useState<{
        open: boolean;
        t: OnlineTranscription | null;
    }>({ open: false, t: null });

    const [deletingId, setDeletingId] = useState<string | null>(null);

    const isRestored = (transcript_id: string) =>
        !!offlineList.find((t) => t.transcript_id === transcript_id) ||
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

    const handleDelete = async (t: OnlineTranscription) => {
        setDeletingId(t.transcript_id);
        try {
            await deleteAssemblyTranscription(t.transcript_id);
            // Remove from onlineList
            setOnlineList(
                onlineList.filter(
                    (item) => item.transcript_id !== t.transcript_id
                )
            );
            setSnackbar({ open: true, msg: "Deleted!", error: false });
        } catch (err: any) {
            setSnackbar({
                open: true,
                msg: err.message || "Delete failed",
                error: true,
            });
        } finally {
            setDeletingId(null);
            setDeleteDialog({ open: false, t: null });
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
                                {/* Restore */}
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
                                                sx={{
                                                    color: colors.grey[100],
                                                    borderColor:
                                                        colors.grey[300],
                                                    "&:hover": {
                                                        borderColor:
                                                            colors.grey[200],
                                                        backgroundColor:
                                                            theme.palette.action
                                                                .hover,
                                                    },
                                                }}
                                            >
                                                {loadingRestore ===
                                                t.transcript_id
                                                    ? "Restoring..."
                                                    : "Restore"}
                                            </Button>
                                        ) : (
                                            <Chip
                                                label="Synced"
                                                color="success"
                                                size="small"
                                            />
                                        )}
                                    </span>
                                </Tooltip>
                                {/* Delete */}
                                {t.audio_url !== "http://deleted_by_user" ? (
                                    <Tooltip title="Delete transcription">
                                        <span>
                                            <IconButton
                                                color="error"
                                                onClick={() =>
                                                    setDeleteDialog({
                                                        open: true,
                                                        t,
                                                    })
                                                }
                                                disabled={
                                                    deletingId ===
                                                    t.transcript_id
                                                }
                                                size="small"
                                            >
                                                <DeleteIcon />
                                            </IconButton>
                                        </span>
                                    </Tooltip>
                                ) : (
                                    <Tooltip title="Already deleted">
                                        <span>
                                            <IconButton disabled size="small">
                                                <DeleteIcon />
                                            </IconButton>
                                        </span>
                                    </Tooltip>
                                )}
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
                                <Box display="flex" alignItems="center">
                                    {t.audio_url}
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
                                </Box>
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
            {/* Delete dialog */}
            <Dialog
                open={deleteDialog.open}
                onClose={() => setDeleteDialog({ open: false, t: null })}
            >
                <DialogTitle>Delete Transcription</DialogTitle>
                <DialogContent>
                    Are you sure you want to delete this transcription? This
                    action cannot be undone.
                </DialogContent>
                <DialogActions>
                    <Button
                        onClick={() =>
                            setDeleteDialog({ open: false, t: null })
                        }
                    >
                        Cancel
                    </Button>
                    <Button
                        color="error"
                        onClick={() => {
                            if (deleteDialog.t) handleDelete(deleteDialog.t);
                        }}
                        disabled={deletingId === deleteDialog.t?.transcript_id}
                    >
                        Delete
                    </Button>
                </DialogActions>
            </Dialog>
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
