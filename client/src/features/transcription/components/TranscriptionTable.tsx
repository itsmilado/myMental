// src/features/transcription/components/transcriptionTable.tsx

import { useState, useEffect } from "react";
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
        (s) => s.removeTranscriptionFromList
    );

    const [snackbar, setSnackbar] = useState<{
        open: boolean;
        message: string;
        error?: boolean;
    }>({ open: false, message: "" });

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

    const formatDuration = (dur: any): string => {
        if (!dur) return "";
        if (typeof dur === "string") return dur;
        const h = String(dur.hours ?? 0).padStart(2, "0");
        const m = String(dur.minutes ?? 0).padStart(2, "0");
        const s = String(Math.floor(dur.seconds ?? 0)).padStart(2, "0");
        return `${h}:${m}:${s}`;
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

    const rowsPerPage = 15;
    const [page, setPage] = useState(0);

    useEffect(() => {
        // If data shrinks (delete), avoid landing on an empty page
        const maxPage = Math.max(0, Math.ceil(data.length / rowsPerPage) - 1);
        if (page > maxPage) setPage(maxPage);
    }, [data.length, page]);

    const paginatedData = data.slice(
        page * rowsPerPage,
        page * rowsPerPage + rowsPerPage
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
                        <TableCell>
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
                        <TableCell align="center">
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
                        <TableCell>File Name</TableCell>
                        <TableCell align="center">Audio Length</TableCell>
                        <TableCell align="center">
                            API ID (AssemblyAI)
                        </TableCell>
                        <TableCell align="center">Actions</TableCell>
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
                            <TableCell>{t.id}</TableCell>
                            <TableCell align="center">
                                {formatDate(t.created_at)}
                            </TableCell>
                            <TableCell>{cleanFileName(t.file_name)}</TableCell>
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
                                                    }
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
