// src/features/transcriptions/hooks/useTranscriptionList.ts

import { useCallback, useEffect } from "react";
import { useTranscriptionStore } from "../../../store/useTranscriptionStore";
import { fetchUserTranscripts } from "../../auth/api";

export const useTranscriptionList = () => {
    const { setList, setLoading, setError, filters, sort } =
        useTranscriptionStore();
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

    // Fetch on mount and whenever filters or sort change
    useEffect(() => {
        loadTranscriptions();
    }, [loadTranscriptions]);

    return { loadTranscriptions };
};
