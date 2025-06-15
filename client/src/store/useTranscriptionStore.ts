import { create } from "zustand";
import { TranscriptionState } from "../types/types";

export const useTranscriptionStore = create<TranscriptionState>((set) => ({
    list: [],
    active: null,
    filters: {},
    loading: false,
    error: null,
    setList: (data) => set({ list: data }),
    setActive: (item) => set({ active: item }),
    setFilters: (filters) => set({ filters }),
    setLoading: (loading) => set({ loading }),
    setError: (error) => set({ error }),
}));
