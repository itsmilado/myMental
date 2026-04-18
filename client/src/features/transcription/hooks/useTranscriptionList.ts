// src/features/transcriptions/hooks/useTranscriptionList.ts

import { useCallback } from "react";
import { useTranscriptionStore } from "../../../store/useTranscriptionStore";
import { fetchUserTranscripts } from "../../auth/api";

export const useTranscriptionList = () => {
    const { setList, setLoading, setError, filters, sort } =
        useTranscriptionStore();

    /*
    - purpose: load offline transcription history using the current store-owned query state
    - inputs: active filter and sort values from the transcription store
    - outputs: updated offline history list, loading state, and error state
    - important behavior: keeps fetch timing under page control so callers decide when history should refresh
    */

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

    // avoids hidden fetch side effects during mount and filter changes
    return { loadTranscriptions };
};
