// src/features/transcription/pages/OnlineHistoryPage.tsx

import { useEffect, useMemo, useState } from "react";
import { Box, Paper, CircularProgress, Typography, Alert } from "@mui/material";

import { useAssemblyTranscriptionList } from "../hooks/useAssemblyTranscriptionList";
import { useAssemblyTranscriptionStore } from "../../../store/useAssemblyTranscriptionStore";

import { OnlineFilterControls } from "../components/FilterControls";
import { OnlineTranscriptionTable } from "../components/OnlineTranscriptionTable";
import { OnlineTranscriptionSidebar } from "../components/OnlineTranscriptionSidebar";
import { OnlineTranscription } from "../../../types/types";

const OnlineHistoryPage = () => {
    const { loadAssemblyTranscriptions } = useAssemblyTranscriptionList();

    const { list, loading, error, searchId, setSearchId } =
        useAssemblyTranscriptionStore();

    const [selected, setSelected] = useState<OnlineTranscription | null>(null);
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [appliedProject, setAppliedProject] = useState("all");

    useEffect(() => {
        loadAssemblyTranscriptions();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    /*
- Build Project options from loaded AssemblyAI history rows
- Keeps filter values aligned with actually available history data
*/
    const projectOptions = useMemo(() => {
        const labels = Array.from(
            new Set(
                list
                    .map(
                        (item) =>
                            item.assemblyai_connection_label?.trim() || "",
                    )
                    .filter(Boolean),
            ),
        );

        const hasDefaultKey = list.some(
            (item) =>
                item.assemblyai_connection_source === "default_connection" &&
                !item.assemblyai_connection_label,
        );

        return hasDefaultKey ? [...labels, "Default key"] : labels;
    }, [list]);

    /*
- Normalize a row date for inclusive date-range filtering
*/
    const getCreatedDateOnly = (value: string): string | null => {
        if (!value) return null;

        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return null;

        return date.toISOString().slice(0, 10);
    };

    const filteredList = useMemo(() => {
        const q = (searchId ?? "").trim().toLowerCase();

        return list.filter((t) => {
            const matchesSearch = q
                ? (t.transcript_id ?? "").toLowerCase().includes(q)
                : true;

            const projectLabel = t.assemblyai_connection_label?.trim() || "";
            const normalizedProject =
                !projectLabel &&
                t.assemblyai_connection_source === "default_connection"
                    ? "Default key"
                    : projectLabel;

            const matchesProject =
                appliedProject === "all"
                    ? true
                    : normalizedProject === appliedProject;

            const createdDate = getCreatedDateOnly(t.created_at);
            const matchesDateFrom = dateFrom
                ? createdDate
                    ? createdDate >= dateFrom
                    : false
                : true;
            const matchesDateTo = dateTo
                ? createdDate
                    ? createdDate <= dateTo
                    : false
                : true;

            return (
                matchesSearch &&
                matchesProject &&
                matchesDateFrom &&
                matchesDateTo
            );
        });
    }, [list, searchId, appliedProject, dateFrom, dateTo]);

    return (
        <Paper sx={{ p: 3, borderRadius: 3, position: "relative" }}>
            {/* Header */}
            <Box
                display="flex"
                alignItems="center"
                justifyContent="space-between"
                mb={2}
            >
                <Box fontSize={24} fontWeight={600} mb={2}>
                    AssemblyAI History
                </Box>
            </Box>

            <OnlineFilterControls
                dateFrom={dateFrom}
                dateTo={dateTo}
                searchId={searchId}
                project={appliedProject}
                projects={projectOptions}
                onDateFromChange={setDateFrom}
                onDateToChange={setDateTo}
                onSearchIdChange={setSearchId}
                onProjectApply={setAppliedProject}
                onClearSearchId={() => setSearchId("")}
            />

            {/* Content */}
            {loading ? (
                <Box
                    height="100%"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                >
                    <CircularProgress />
                </Box>
            ) : error ? (
                <Box p={2}>
                    <Alert severity="error">{error}</Alert>
                </Box>
            ) : !filteredList.length ? (
                <Box
                    height="100%"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                >
                    <Typography variant="body2" color="text.secondary">
                        {searchId ||
                        dateFrom ||
                        dateTo ||
                        appliedProject !== "all"
                            ? "No transcriptions match the current filters."
                            : "No AssemblyAI history found."}
                    </Typography>
                </Box>
            ) : (
                <OnlineTranscriptionTable
                    data={filteredList}
                    onDetails={setSelected}
                />
            )}

            {/* Sidebar */}
            <OnlineTranscriptionSidebar
                open={!!selected}
                transcription={selected}
                onClose={() => setSelected(null)}
            />
        </Paper>
    );
};

export default OnlineHistoryPage;
