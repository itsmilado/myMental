import { useState } from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TableSortLabel,
    Paper,
    CircularProgress,
    Box,
} from "@mui/material";
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

const columns = [
    { id: "id", label: "ID" },
    { id: "file_name", label: "File Name" },
    { id: "file_recorded_at", label: "Date" },
    { id: "transcript_id", label: "API ID (AssemblyAI)" },
    { id: "actions", label: "Actions" }, // <- New Actions column

    // Add status, model, etc. as needed
];

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
            <TableContainer component={Paper} sx={{ borderRadius: 3 }}>
                <Table>
                    <TableHead>
                        <TableRow>
                            {columns.map((col) => (
                                <TableCell key={col.id}>
                                    {col.id !== "actions" ? (
                                        <TableSortLabel
                                            active={sort.orderBy === col.id}
                                            direction={
                                                sort.orderBy === col.id
                                                    ? sort.direction
                                                    : "asc"
                                            }
                                            onClick={() => handleSort(col.id)}
                                        >
                                            {col.label}
                                        </TableSortLabel>
                                    ) : (
                                        col.label
                                    )}
                                </TableCell>
                            ))}
                            {/* Add more columns as needed */}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {data.map((t) => (
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
                                <TableCell>{t.file_name}</TableCell>
                                <TableCell>{t.file_recorded_at}</TableCell>
                                <TableCell>{t.transcript_id}</TableCell>
                                <TableCell>
                                    <ExportButton
                                        transcriptId={t.id}
                                        fileName={t.file_name}
                                    />
                                    <DeleteButton
                                        onDelete={async () => {
                                            try {
                                                const msg =
                                                    await deleteTranscription(
                                                        t.id
                                                    );
                                                removeTranscriptionFromList(
                                                    t.id
                                                );
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
                                                        error.message ||
                                                        "Delete failed",
                                                    error: true,
                                                });
                                                throw error;
                                            }
                                        }}
                                    />
                                </TableCell>
                                {/* Render other fields and actions */}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </>
    );
};
