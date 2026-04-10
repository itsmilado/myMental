// src/features/transcription/pages/OnlineHistoryPage.tsx

import { useEffect, useMemo, useState } from "react";
import { Box, Paper, CircularProgress, Typography, Alert } from "@mui/material";

import { useAssemblyTranscriptionList } from "../hooks/useAssemblyTranscriptionList";
import { useAssemblyTranscriptionStore } from "../../../store/useAssemblyTranscriptionStore";

import { OnlineFilterControls } from "../components/FilterControls";
import { OnlineTranscriptionTable } from "../components/OnlineTranscriptionTable";
import { OnlineTranscriptionSidebar } from "../components/OnlineTranscriptionSidebar";
import { fetchMyAssemblyConnections } from "../../auth/api";
import {
    OnlineTranscription,
    AssemblyAiConnection,
} from "../../../types/types";

const OnlineHistoryPage = () => {
    const { loadAssemblyTranscriptions } = useAssemblyTranscriptionList();

    const { list, loading, error, searchId, setSearchId } =
        useAssemblyTranscriptionStore();

    const [selected, setSelected] = useState<OnlineTranscription | null>(null);
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [appliedProject, setAppliedProject] = useState("all");
    const [connectionOptions, setConnectionOptions] = useState<
        AssemblyAiConnection[]
    >([]);

    useEffect(() => {
        loadAssemblyTranscriptions();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    /*
- Loads saved AssemblyAI connections so the Project filter reflects all user API keys.
- Inputs: none.
- Outputs: stored connection options for the Project filter.
- Important behavior: history loading remains independent if connection loading fails.
*/
    useEffect(() => {
        const loadConnections = async (): Promise<void> => {
            try {
                const connections = await fetchMyAssemblyConnections();
                setConnectionOptions(connections);
            } catch {
                setConnectionOptions([]);
            }
        };

        void loadConnections();
    }, []);

    /*
- Normalizes a history row into the Project label used by filters and metadata.
- Inputs: one online transcription row.
- Outputs: one display-safe Project label.
- Important behavior: preserves fallback labels for default and app-owned access.
*/
    const getProjectLabel = (item: OnlineTranscription): string | null => {
        const trimmedLabel = String(
            item.assemblyai_connection_label || "",
        ).trim();

        if (trimmedLabel) {
            return trimmedLabel;
        }

        if (item.assemblyai_connection_source === "default_connection") {
            return "Default key";
        }

        if (item.assemblyai_connection_source === "app_fallback") {
            return "App fallback";
        }

        return null;
    };

    /*
- Builds Project options from saved user connections first, then merges history-only labels.
- Inputs: saved connection rows and current history rows.
- Outputs: stable Project filter options covering all API keys.
- Important behavior: preserves legacy/default/app fallback labels when they appear in history.
*/
    const projectOptions = useMemo(() => {
        const savedLabels = connectionOptions
            .map((connection) => String(connection.label || "").trim())
            .filter(Boolean);

        const historyLabels = list
            .map((item) => getProjectLabel(item))
            .filter((value): value is string => Boolean(value));

        return Array.from(new Set([...savedLabels, ...historyLabels]));
    }, [connectionOptions, list]);

    /*
- Normalize a row date for inclusive date-range filtering.
- Inputs: raw created_at value.
- Outputs: YYYY-MM-DD string or null.
- Important behavior: ignores invalid dates safely.
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

            const normalizedProject = getProjectLabel(t);
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

    /*
- Closes the sidebar if the selected row is filtered out of the visible list.
- Inputs: selected row and filtered list.
- Outputs: none.
- Important behavior: prevents stale detail state after Project/date/search changes.
*/
    useEffect(() => {
        if (!selected) return;

        const stillVisible = filteredList.some(
            (item) => item.transcript_id === selected.transcript_id,
        );

        if (!stillVisible) {
            setSelected(null);
        }
    }, [filteredList, selected]);

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
