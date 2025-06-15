// src/features/transcriptions/hooks/useTranscriptionList.ts

import { useCallback } from "react";
import { useTranscriptionStore } from "../../../store/useTranscriptionStore";
import { fetchUserTranscripts } from "../../auth/api";

export const useTranscriptionList = () => {
    const { setList, setLoading, setError } = useTranscriptionStore();
    const loadTranscriptions = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const data = await fetchUserTranscripts();
            setList(data);
        } catch (error: any) {
            setError(error.message || "Failed to load transcriptions");
        } finally {
            setLoading(false);
        }
    }, [setList, setLoading, setError]);

    return { loadTranscriptions };
};
