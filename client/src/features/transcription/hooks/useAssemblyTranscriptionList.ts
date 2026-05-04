// src/features/transcription/hooks/useAssemblyTranscriptionList.ts

import { useAssemblyTranscriptionStore } from "../../../store/useAssemblyTranscriptionStore";
import { fetchAssemblyTranscriptions } from "../../../api/authApi";

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
            setError(error.message || "Failed to load AssemblyAI history");
        } finally {
            setLoading(false);
        }
    };

    return { loadAssemblyTranscriptions };
};
