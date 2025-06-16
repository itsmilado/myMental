// src/features/transcriptions/hooks/useTranscriptionList.ts

import { useCallback, useEffect } from "react";
import { useTranscriptionStore } from "../../../store/useTranscriptionStore";
import { fetchUserTranscripts } from "../../auth/api";

export const useTranscriptionList = () => {
    const { setList, setLoading, setError, filters } = useTranscriptionStore();
    const loadTranscriptions = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const data = await fetchUserTranscripts(filters);
            setList(data);
        } catch (error: any) {
            setError(error.message || "Failed to load transcriptions");
        } finally {
            setLoading(false);
        }
    }, [filters, setList, setLoading, setError]);

    useEffect(() => {
        loadTranscriptions();
    }, [loadTranscriptions]);

    return { loadTranscriptions };
};
