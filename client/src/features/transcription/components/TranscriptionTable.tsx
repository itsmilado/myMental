// src/features/transcription/components/transcriptionTable.tsx

import { useState, useEffect, useRef } from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    TableSortLabel,
    CircularProgress,
    Box,
    Snackbar,
    Alert,
    Chip,
    IconButton,
    Tooltip,
    TablePagination,
} from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";

import { useTranscriptionStore } from "../../../store/useTranscriptionStore";
import { TranscriptData } from "../../../types/types";
import { ExportButton } from "./ExportButton";
import { DeleteButton } from "./DeleteButton";
import { deleteTranscription } from "../../auth/api";

type Props = {
    data: TranscriptData[];
    loading: boolean;
    error: string | null;
    onRowClick?: (t: TranscriptData) => void;
};

export const TranscriptionTable = ({
    data,
    loading,
    error,
    onRowClick,
}: Props) => {
    const { sort, setSort } = useTranscriptionStore();
    const removeTranscriptionFromList = useTranscriptionStore(
        (s) => s.removeTranscriptionFromList,
    );

    const [snackbar, setSnackbar] = useState<{
        open: boolean;
        message: string;
        error?: boolean;
    }>({ open: false, message: "" });

    const [copiedTranscriptId, setCopiedTranscriptId] = useState<string | null>(
        null,
    );
    const copyFeedbackTimeoutRef = useRef<number | null>(null);

    /*
    - Updates offline history sort state for supported columns.
    */
    const handleSort = (col: string) => {
        if (sort.orderBy === col) {
            setSort({
                orderBy: col as any,
                direction: sort.direction === "asc" ? "desc" : "asc",
            });
        } else {
            setSort({ orderBy: col as any, direction: "asc" });
        }
    };

    /*
    - Formats audio duration consistently for offline history rows.
    */
    const formatDuration = (dur: any): string => {
        if (!dur) return "-";
        if (typeof dur === "string") return dur;
        const h = String(dur.hours ?? 0).padStart(2, "0");
        const m = String(dur.minutes ?? 0).padStart(2, "0");
        const s = String(Math.floor(dur.seconds ?? 0)).padStart(2, "0");
        return `${h}:${m}:${s}`;
    };

    /*
    - Shortens long transcript ids to a compact chip-friendly display value.
    */
    const shortenTranscriptId = (value: string | null | undefined): string => {
        if (!value) return "-";
        if (value.length <= 12) return value;

        const start = value.slice(0, 6);
        const end = value.slice(-6);
        return `${start}…${end}`;
    };

    /*
    - Removes generated transcription suffixes from displayed file names.
    */
    const cleanFileName = (fileName: string | null | undefined) => {
        if (!fileName) return "-";

        return fileName.replace(/_Transcribed\([^)]*\)(?=\.)/, "");
    };

    /*
    - Formats table dates using the same fixed display pattern as online history.
    */
    const formatDate = (value: string | null | undefined) => {
        if (!value) return "-";
        const d = new Date(value);
        if (Number.isNaN(d.getTime())) return value;

        const day = String(d.getDate()).padStart(2, "0");
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const year = d.getFullYear();
        const hours = String(d.getHours()).padStart(2, "0");
        const minutes = String(d.getMinutes()).padStart(2, "0");

        return `${day}.${month}.${year}_${hours}:${minutes}`;
    };

    /*
    - Normalizes Category labels for the offline Category column.
    */
    const getCategoryLabel = (t: TranscriptData): string => {
        const trimmedCategory = String(t.category || "").trim();
        return trimmedCategory || "Uncategorized";
    };

    /*
    - Normalizes Project labels for the offline Project column.
    */
    const getProjectLabel = (t: TranscriptData): string => {
        const trimmedLabel = String(t.assemblyai_connection_label || "").trim();

        if (trimmedLabel) {
            return trimmedLabel;
        }

        if (t.assemblyai_connection_source === "default_connection") {
            return "Default key";
        }

        if (t.assemblyai_connection_source === "app_fallback") {
            return "App fallback";
        }

        return "-";
    };

    /*
    - Copies transcript ids and shows temporary row-level visual feedback.
    */
    const handleCopyTranscriptId = async (
        transcriptId: string,
    ): Promise<void> => {
        await navigator.clipboard.writeText(transcriptId);
        setCopiedTranscriptId(transcriptId);

        if (copyFeedbackTimeoutRef.current) {
            window.clearTimeout(copyFeedbackTimeoutRef.current);
        }

        copyFeedbackTimeoutRef.current = window.setTimeout(() => {
            setCopiedTranscriptId(null);
        }, 2000);
    };

    const rowsPerPage = 15;
    const [page, setPage] = useState(0);

    useEffect(() => {
        const maxPage = Math.max(0, Math.ceil(data.length / rowsPerPage) - 1);
        if (page > maxPage) setPage(maxPage);
    }, [data.length, page]);

    useEffect(() => {
        return () => {
            if (copyFeedbackTimeoutRef.current) {
                window.clearTimeout(copyFeedbackTimeoutRef.current);
            }
        };
    }, []);

    const paginatedData = data.slice(
        page * rowsPerPage,
        page * rowsPerPage + rowsPerPage,
    );

    if (loading)
        return (
            <Box
                display="flex"
                justifyContent="center"
                alignItems="center"
                minHeight={200}
            >
                <CircularProgress />
            </Box>
        );
    if (error) return <Box p={2}>{error}</Box>;
    if (!data.length) return <Box p={2}>No transcriptions found.</Box>;

    return (
        <>
            <Table size="small">
                <TableHead>
                    <TableRow>
                        <TableCell sx={{ width: 90 }} align="center">
                            <TableSortLabel
                                active={sort.orderBy === "id"}
                                direction={
                                    sort.orderBy === "id"
                                        ? sort.direction
                                        : "asc"
                                }
                                onClick={() => handleSort("id")}
                            >
                                ID
                            </TableSortLabel>
                        </TableCell>
                        <TableCell align="center" sx={{ minWidth: 160 }}>
                            <TableSortLabel
                                active={sort.orderBy === "file_recorded_at"}
                                direction={
                                    sort.orderBy === "file_recorded_at"
                                        ? sort.direction
                                        : "asc"
                                }
                                onClick={() => handleSort("file_recorded_at")}
                            >
                                Date
                            </TableSortLabel>
                        </TableCell>
                        <TableCell sx={{ minWidth: 160 }} align="center">
                            Project
                        </TableCell>
                        <TableCell sx={{ minWidth: 160 }} align="center">
                            Category
                        </TableCell>
                        <TableCell sx={{ minWidth: 260 }} align="center">
                            File Name
                        </TableCell>
                        <TableCell align="center" sx={{ width: 130 }}>
                            Audio Length
                        </TableCell>
                        <TableCell align="center" sx={{ minWidth: 240 }}>
                            API ID (AssemblyAI)
                        </TableCell>
                        <TableCell align="center" sx={{ width: 130 }}>
                            Actions
                        </TableCell>
                    </TableRow>
                </TableHead>

                <TableBody>
                    {paginatedData.map((t) => (
                        <TableRow
                            key={t.id}
                            hover
                            sx={{
                                cursor: onRowClick ? "pointer" : "default",
                            }}
                            onClick={
                                onRowClick ? () => onRowClick(t) : undefined
                            }
                        >
                            <TableCell align="center">{t.id}</TableCell>
                            <TableCell align="center">
                                {formatDate(t.created_at)}
                            </TableCell>
                            <TableCell align="center">
                                <Box
                                    sx={{
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                        whiteSpace: "nowrap",
                                    }}
                                >
                                    {getProjectLabel(t)}
                                </Box>
                            </TableCell>
                            <TableCell align="center">
                                <Box
                                    sx={{
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                        whiteSpace: "nowrap",
                                    }}
                                >
                                    {getCategoryLabel(t)}
                                </Box>
                            </TableCell>
                            <TableCell sx={{ maxWidth: 0 }} align="center">
                                <Box
                                    sx={{
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                        whiteSpace: "nowrap",
                                    }}
                                >
                                    {cleanFileName(t.file_name)}
                                </Box>
                            </TableCell>

                            <TableCell align="center">
                                {formatDuration(t.audio_duration)}
                            </TableCell>
                            <TableCell
                                onClick={(e) => {
                                    e.stopPropagation();
                                }}
                                align="center"
                            >
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
                                                    t.transcript_id,
                                                )}
                                            </Box>
                                            <Tooltip
                                                title={
                                                    copiedTranscriptId ===
                                                    t.transcript_id
                                                        ? "Copied"
                                                        : "Copy Transcript ID"
                                                }
                                            >
                                                <IconButton
                                                    size="small"
                                                    onClick={() =>
                                                        handleCopyTranscriptId(
                                                            t.transcript_id,
                                                        )
                                                    }
                                                >
                                                    {copiedTranscriptId ===
                                                    t.transcript_id ? (
                                                        <CheckCircleIcon fontSize="inherit" />
                                                    ) : (
                                                        <ContentCopyIcon fontSize="inherit" />
                                                    )}
                                                </IconButton>
                                            </Tooltip>
                                        </Box>
                                    }
                                />
                            </TableCell>

                            <TableCell
                                onClick={(e) => {
                                    e.stopPropagation();
                                }}
                                align="center"
                            >
                                <ExportButton
                                    transcriptId={t.id}
                                    fileName={t.file_name}
                                />
                                <DeleteButton
                                    onDelete={async ({
                                        deleteFromAssembly,
                                        deleteServerFiles,
                                    }) => {
                                        try {
                                            const msg =
                                                await deleteTranscription(
                                                    t.id,
                                                    {
                                                        deleteFromAssembly,
                                                        deleteTxtFile:
                                                            deleteServerFiles,
                                                        deleteAudioFile:
                                                            deleteServerFiles,
                                                    },
                                                );
                                            removeTranscriptionFromList(t.id);
                                            setSnackbar({
                                                open: true,
                                                message: msg,
                                                error: false,
                                            });
                                            return msg;
                                        } catch (error: any) {
                                            setSnackbar({
                                                open: true,
                                                message:
                                                    error?.message ||
                                                    "Delete failed",
                                                error: true,
                                            });
                                            throw error;
                                        }
                                    }}
                                />
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>

            <TablePagination
                component="div"
                count={data.length}
                page={page}
                onPageChange={(_, newPage) => setPage(newPage)}
                rowsPerPage={rowsPerPage}
                rowsPerPageOptions={[rowsPerPage]}
            />

            <Snackbar
                open={snackbar.open}
                autoHideDuration={2500}
                onClose={() =>
                    setSnackbar((prev) => ({ ...prev, open: false }))
                }
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            >
                <Alert
                    onClose={() =>
                        setSnackbar((prev) => ({ ...prev, open: false }))
                    }
                    severity={snackbar.error ? "error" : "success"}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </>
    );
};
