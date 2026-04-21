// src/features/transcription/pages/OfflineHistoryPage.tsx

import { useEffect, useMemo, useRef, useState } from "react";
import { Box, Paper, CircularProgress, Alert, Typography } from "@mui/material";

import { useTranscriptionStore } from "../../../store/useTranscriptionStore";
import { useTranscriptionList } from "../hooks/useTranscriptionList";
import { TranscriptionTable } from "../components/TranscriptionTable";
import { OfflineFilterControls } from "../components/FilterControls";
import { OfflineTranscriptionModal } from "../components/OfflineTranscriptionModal";
import type { TranscriptData } from "../../../types/types";

export const OfflineHistoryPage = () => {
    const { list, loading, error, setActive, filters, sort } =
        useTranscriptionStore();
    const { loadTranscriptions } = useTranscriptionList();

    const [selected, setSelected] = useState<TranscriptData | null>(null);
    const [appliedProject, setAppliedProject] = useState("all");
    const [appliedCategory, setAppliedCategory] = useState("all");

    // Trigger initial data load when the page mounts
    useEffect(() => {
        loadTranscriptions();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Re-fetch when filters or sort change, skipping the initial render
    const didMountRef = useRef(false);

    useEffect(() => {
        if (!didMountRef.current) {
            didMountRef.current = true;
            return;
        }
        loadTranscriptions();
    }, [filters, sort, loadTranscriptions]);

    /*
- Normalizes a local transcript row into the Project label used by filters and the table.
- Inputs: one offline transcription row.
- Outputs: one display-safe Project label.
- Important behavior: preserves default/app fallback labels when no custom label was stored.
*/
    const getProjectLabel = (item: TranscriptData): string | null => {
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
- Normalizes a local transcript row into the Category label used by filters and table display.
- Inputs: one offline transcription row.
- Outputs: one display-safe Category label.
- Important behavior: uses "Uncategorized" when no category was stored.
*/
    const getCategoryLabel = (item: TranscriptData): string => {
        const trimmedCategory = String(item.category || "").trim();
        return trimmedCategory || "Uncategorized";
    };

    /*
- Builds the offline Project filter options from currently loaded rows.
- Inputs: current offline history list.
- Outputs: deduplicated Project labels for the offline filter popover.
- Important behavior: stays client-side to avoid backend/API scope changes in Issue #118.
*/
    const projectOptions = useMemo(() => {
        return Array.from(
            new Set(
                list
                    .map((item) => getProjectLabel(item))
                    .filter((value): value is string => Boolean(value)),
            ),
        );
    }, [list]);

    /*
- Builds the offline Category filter options from currently loaded rows.
- Inputs: current offline history list.
- Outputs: deduplicated Category labels for the offline filter popover.
- Important behavior: includes the display fallback for rows without a stored category.
*/
    const categoryOptions = useMemo(() => {
        return Array.from(new Set(list.map((item) => getCategoryLabel(item))));
    }, [list]);

    /*
- Applies local Project and Category filtering on top of the loaded offline rows.
- Inputs: current offline history list and applied local filters.
- Outputs: filtered offline transcription rows.
- Important behavior: keeps metadata filtering local without changing table interaction behavior.
*/
    const filteredList = useMemo(() => {
        return list.filter((item) => {
            const matchesProject =
                appliedProject === "all"
                    ? true
                    : getProjectLabel(item) === appliedProject;

            const matchesCategory =
                appliedCategory === "all"
                    ? true
                    : getCategoryLabel(item) === appliedCategory;

            return matchesProject && matchesCategory;
        });
    }, [list, appliedProject, appliedCategory]);

    /*
- Closes the offline detail modal if the selected row is filtered out locally.
- Inputs: selected transcript and filtered list.
- Outputs: none.
- Important behavior: keeps modal state aligned with current offline filters.
*/
    useEffect(() => {
        if (!selected) return;

        const stillVisible = filteredList.some(
            (item) => item.id === selected.id,
        );

        if (!stillVisible) {
            setSelected(null);
        }
    }, [filteredList, selected]);

    return (
        <Paper sx={{ p: 3, borderRadius: 3, position: "relative" }}>
            <Box
                display="flex"
                alignItems="center"
                justifyContent="space-between"
                mb={2}
            >
                <Box fontSize={24} fontWeight={600}>
                    My Transcriptions
                </Box>
            </Box>

            <OfflineFilterControls
                project={appliedProject}
                projects={projectOptions}
                category={appliedCategory}
                categories={categoryOptions}
                onProjectApply={setAppliedProject}
                onCategoryApply={setAppliedCategory}
            />

            {loading ? (
                <Box display="flex" justifyContent="center" py={5}>
                    <CircularProgress />
                </Box>
            ) : error ? (
                <Alert severity="error">{error}</Alert>
            ) : filteredList.length === 0 ? (
                <Typography
                    color="text.secondary"
                    sx={{ py: 6, textAlign: "center" }}
                >
                    {filters.file_name ||
                    filters.transcript_id ||
                    filters.date_from ||
                    filters.date_to ||
                    appliedProject !== "all" ||
                    appliedCategory !== "all"
                        ? "No transcriptions match the current filters."
                        : "No offline transcriptions found."}
                </Typography>
            ) : (
                <TranscriptionTable
                    data={filteredList}
                    loading={loading}
                    error={error}
                    onRowClick={(t) => {
                        setActive(t);
                        setSelected(t);
                    }}
                />
            )}

            <OfflineTranscriptionModal
                open={!!selected}
                transcription={selected}
                onClose={() => setSelected(null)}
            />
        </Paper>
    );
};
