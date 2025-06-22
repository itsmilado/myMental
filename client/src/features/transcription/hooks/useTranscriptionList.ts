// src/features/transcriptions/hooks/useTranscriptionList.ts

import { useTranscriptionStore } from "../../../store/useTranscriptionStore";
import { fetchUserTranscripts } from "../../auth/api";

export const useTranscriptionList = () => {
    const { setList, setLoading, setError, filters, sort } =
        useTranscriptionStore();
    const loadTranscriptions = async () => {
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
    };

    return { loadTranscriptions };
};
