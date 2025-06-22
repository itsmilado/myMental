// src/features/transcription/hooks/useAssemblyTranscriptionList.ts

import { useAssemblyTranscriptionStore } from "../../../store/useAssemblyTranscriptionStore";
import { fetchAssemblyTranscriptions } from "../../auth/api";

export const useAssemblyTranscriptionList = () => {
    const { setList, setLoading, setError, searchId } =
        useAssemblyTranscriptionStore();

    const loadAssemblyTranscriptions = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await fetchAssemblyTranscriptions(searchId);
            setList(data);
        } catch (error: any) {
            setError(error.message || "Failed to load online transcriptions");
        } finally {
            setLoading(false);
        }
    };

    return { loadAssemblyTranscriptions };
};
