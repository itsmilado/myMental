// /src/store/useTranscriptionStore.ts

import { create } from "zustand";
import { TranscriptionState } from "../types/types";

export const useTranscriptionStore = create<TranscriptionState>((set) => ({
    list: [],
    active: null,
    filters: {},
    loading: false,
    error: null,
    sort: {
        orderBy: "file_recorded_at",
        direction: "desc",
    },
    setList: (data) => set({ list: data }),
    setActive: (item) => set({ active: item }),
    setFilters: (filters) => set({ filters }),
    setLoading: (loading) => set({ loading }),
    setError: (error) => set({ error }),
    setSort: (sort) => set({ sort }),
    removeTranscriptionFromList: (id) =>
        set((state) => ({
            list: state.list.filter((t) => t.id !== id),
            // clear active if it's the deleted item:
            active:
                state.active && state.active.id === id ? null : state.active,
        })),
}));
