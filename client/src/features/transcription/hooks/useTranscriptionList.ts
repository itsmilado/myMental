// src/features/transcriptions/hooks/useTranscriptionList.ts

import { useCallback } from "react";
import { useTranscriptionStore } from "../../../store/useTranscriptionStore";
import { fetchUserTranscripts } from "../../auth/api";

export const useTranscriptionList = () => {
    const { setList, setLoading, setError, filters, sort } =
        useTranscriptionStore();

    // Fetch transcriptions using the current filter and sort state
    const loadTranscriptions = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const data = await fetchUserTranscripts(filters, sort);
            setList(data);
        } catch (error: any) {
            setError(error.message || "Failed to load transcriptions");
        } finally {
            setLoading(false);
        }
    }, [filters, sort, setList, setLoading, setError]);

    // Fetch timing is controlled by the consuming page
    return { loadTranscriptions };
};
