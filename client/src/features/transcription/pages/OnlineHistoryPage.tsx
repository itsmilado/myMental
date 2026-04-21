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

export const OnlineHistoryPage = () => {
    const { loadAssemblyTranscriptions } = useAssemblyTranscriptionList();

    const { list, loading, error, searchId, setSearchId } =
        useAssemblyTranscriptionStore();

    const [selected, setSelected] = useState<OnlineTranscription | null>(null);
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [appliedProject, setAppliedProject] = useState("all");
    const [appliedCategory, setAppliedCategory] = useState("all");
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
- Normalizes a history row into the Category label used by filters and table display.
- Inputs: one online transcription row.
- Outputs: one display-safe Category label.
- Important behavior: uses "Uncategorized" when no category was stored.
*/
    const getCategoryLabel = (item: OnlineTranscription): string => {
        const trimmedCategory = String(item.category || "").trim();
        return trimmedCategory || "Uncategorized";
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
- Builds Category options from the current online history rows.
- Inputs: current AssemblyAI history list.
- Outputs: deduplicated Category labels for the online Category filter.
- Important behavior: includes the display fallback for rows without a stored category.
*/
    const categoryOptions = useMemo(() => {
        return Array.from(new Set(list.map((item) => getCategoryLabel(item))));
    }, [list]);

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

    /*
- Applies search, Project, Category, and date filters to the online history list.
- Inputs: current online rows and applied filter values.
- Outputs: filtered online transcription rows for the table and sidebar.
- Important behavior: keeps online filtering fully client-side.
*/
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

            const normalizedCategory = getCategoryLabel(t);
            const matchesCategory =
                appliedCategory === "all"
                    ? true
                    : normalizedCategory === appliedCategory;

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
                matchesCategory &&
                matchesDateFrom &&
                matchesDateTo
            );
        });
    }, [list, searchId, appliedProject, appliedCategory, dateFrom, dateTo]);

    const handleClearFilters = () => {
        setDateFrom("");
        setDateTo("");
        setSearchId("");
        setAppliedProject("all");
        setAppliedCategory("all");
    };

    /*
- Closes the sidebar if the selected row is filtered out of the visible list.
- Inputs: selected row and filtered list.
- Outputs: none.
- Important behavior: prevents stale detail state after Project/category/date/search changes.
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
                category={appliedCategory}
                categories={categoryOptions}
                onDateFromChange={setDateFrom}
                onDateToChange={setDateTo}
                onSearchIdChange={setSearchId}
                onProjectApply={setAppliedProject}
                onCategoryApply={setAppliedCategory}
                onClearSearchId={() => setSearchId("")}
                onClearFilters={handleClearFilters}
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
                        appliedProject !== "all" ||
                        appliedCategory !== "all"
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
