// src/features/transcription/hooks/useAssemblyTranscriptionList.ts

import { useCallback, useEffect } from "react";
import { useAssemblyTranscriptionStore } from "../../../store/useAssemblyTranscriptionStore";
import { fetchAssemblyTranscriptions } from "../../auth/api";

export const useAssemblyTranscriptionList = () => {
    const { setList, setLoading, setError, searchId } =
        useAssemblyTranscriptionStore();

    const loadAssemblyTranscriptions = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await fetchAssemblyTranscriptions(searchId);
            setList(data);
        } catch (error: any) {
            setError(
                error.message || "Failed to load online transcriptions history"
            );
        } finally {
            setLoading(false);
        }
    }, [searchId, setList, setLoading, setError]);

    useEffect(() => {
        loadAssemblyTranscriptions();
    }, [searchId, loadAssemblyTranscriptions]);

    return { loadAssemblyTranscriptions };
};
