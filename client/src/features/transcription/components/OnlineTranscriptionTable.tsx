// src/features/transcription/components/OnlineTranscriptionTable.tsx

import { useState, useEffect } from "react";
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
    TablePagination,
    CircularProgress,
} from "@mui/material";
import RestoreIcon from "@mui/icons-material/Restore";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import DeleteIcon from "@mui/icons-material/Delete";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";

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
    const { list: onlineList, setList: setOnlineList } =
        useAssemblyTranscriptionStore();

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

    // Pagination: 20 rows per page
    const [page, setPage] = useState(0);

    const rowsPerPage = 15;
    const handleChangePage = (_event: unknown, newPage: number) => {
        setPage(newPage);
    };

    const paginatedData = data.slice(
        page * rowsPerPage,
        page * rowsPerPage + rowsPerPage
    );

    // Reset page if data length shrinks below current page
    useEffect(() => {
        if (page > 0 && page * rowsPerPage >= data.length) {
            setPage(0);
        }
    }, [data.length, page, rowsPerPage]);

    const shorten = (value: string | null | undefined, max: number) => {
        if (!value) return "-";
        return value.length > max ? `${value.slice(0, max)}…` : value;
    };

    const shortenTranscriptId = (value: string | null | undefined): string => {
        if (!value) return "-";
        if (value.length <= 12) return value;

        const start = value.slice(0, 6);
        const end = value.slice(-6);
        return `${start}…${end}`;
    };

    const cleanFileName = (fileName: string | null | undefined) => {
        if (!fileName) return "-";

        // Remove suffix like: _Transcribed(Date) before the extension
        return fileName.replace(/_Transcribed\([^)]*\)(?=\.)/, "");
    };

    const formatDate = (value: string | null | undefined) => {
        if (!value) return "-";
        const d = new Date(value);
        if (Number.isNaN(d.getTime())) return value; // fallback to raw if invalid

        const day = String(d.getDate()).padStart(2, "0");
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const year = d.getFullYear();
        const hours = String(d.getHours()).padStart(2, "0");
        const minutes = String(d.getMinutes()).padStart(2, "0");

        // dd.MM.yyyy HH:mm
        return `${day}.${month}.${year}_${hours}:${minutes}`;
    };

    const isRestored = (transcript_id: string) =>
        !!offlineList.find((t) => t.transcript_id === transcript_id);

    const handleRestore = async (t: OnlineTranscription) => {
        setLoadingRestore(t.transcript_id);
        try {
            const data = await restoreTranscription({
                transcript_id: t.transcript_id,
                // transcription: t.transcription,
                file_recorded_at: t.created_at,
                file_name: t.file_name,
                audio_duration: t.audio_duration,
            });
            addTranscription(data);

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
                        <TableCell>Date</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>File Name</TableCell>
                        <TableCell>Audio Length</TableCell>
                        <TableCell>Transcript ID</TableCell>
                        <TableCell>Audio URL</TableCell>
                        <TableCell>Actions</TableCell>
                        <TableCell align="center">Details</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {paginatedData.map((t) => (
                        <TableRow
                            key={t.transcript_id}
                            hover
                            sx={
                                t.audio_url === "http://deleted_by_user"
                                    ? {
                                          backgroundColor: "action.hover",
                                          "& td": {
                                              fontStyle: "italic",
                                              opacity: 0.8,
                                          },
                                      }
                                    : undefined
                            }
                        >
                            <TableCell>{formatDate(t.created_at)}</TableCell>
                            <TableCell>
                                {t.audio_url === "http://deleted_by_user"
                                    ? "deleted"
                                    : t.status}
                            </TableCell>
                            <TableCell>{cleanFileName(t.file_name)}</TableCell>
                            <TableCell>{t.audio_duration || "-"}</TableCell>
                            <TableCell>
                                <Chip
                                    variant="outlined"
                                    sx={{
                                        backgroundColor: "action.hover",
                                        px: 1,
                                        maxWidth: 260,
                                        borderRadius: "6px",
                                        "& .MuiChip-label": {
                                            px: 0,
                                        },
                                    }}
                                    label={
                                        <Box
                                            display="flex"
                                            alignItems="center"
                                            justifyContent="space-between"
                                            width="100%"
                                        >
                                            <Box
                                                component="span"
                                                sx={{
                                                    fontFamily: "monospace",
                                                    fontSize: "0.8rem",
                                                    mr: 1,
                                                    overflow: "hidden",
                                                    textOverflow: "ellipsis",
                                                    whiteSpace: "nowrap",
                                                }}
                                            >
                                                {shortenTranscriptId(
                                                    t.transcript_id
                                                )}
                                            </Box>
                                            <Tooltip title="Copy Transcript ID">
                                                <IconButton
                                                    size="small"
                                                    onClick={() =>
                                                        navigator.clipboard.writeText(
                                                            t.transcript_id
                                                        )
                                                    }
                                                >
                                                    <ContentCopyIcon fontSize="inherit" />
                                                </IconButton>
                                            </Tooltip>
                                        </Box>
                                    }
                                />
                            </TableCell>
                            <TableCell>
                                <Box display="flex" alignItems="center">
                                    {t.audio_url === "http://deleted_by_user"
                                        ? "deleted_by_user"
                                        : shorten(t.audio_url, 40)}
                                </Box>
                            </TableCell>
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
                                            <IconButton
                                                size="small"
                                                onClick={() => handleRestore(t)}
                                                disabled={
                                                    loadingRestore ===
                                                        t.transcript_id ||
                                                    t.audio_url ===
                                                        "http://deleted_by_user"
                                                }
                                                sx={{
                                                    borderRadius: "6px",

                                                    padding: "2px",
                                                }}
                                            >
                                                {loadingRestore ===
                                                t.transcript_id ? (
                                                    <CircularProgress
                                                        size={16}
                                                    />
                                                ) : (
                                                    <RestoreIcon fontSize="small" />
                                                )}
                                            </IconButton>
                                        ) : (
                                            <Tooltip title="Already restored">
                                                <IconButton
                                                    size="small"
                                                    disabled
                                                    sx={{
                                                        borderRadius: "6px",
                                                        color: "success.main",
                                                        padding: "2px",
                                                    }}
                                                >
                                                    <CheckCircleIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
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
            <TablePagination
                component="div"
                count={data.length}
                page={page}
                onPageChange={handleChangePage}
                rowsPerPage={rowsPerPage}
                rowsPerPageOptions={[rowsPerPage]}
            />
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
