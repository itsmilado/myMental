// src/store/useAssemblyTranscriptionStore.ts
//Online tab store

import { create } from "zustand";
import { AssemblyTranscriptionState } from "../types/types";

export const useAssemblyTranscriptionStore = create<AssemblyTranscriptionState>(
    (set) => ({
        list: [],
        loading: false,
        error: null,
        searchId: "",
        restoredIds: [],
        setList: (data) => set({ list: data }),
        setLoading: (loading) => set({ loading }),
        setError: (error) => set({ error }),
        setSearchId: (id) => set({ searchId: id }),
        setRestored: (transcript_id: string) =>
            set((state) => ({
                restoredIds: [...(state.restoredIds || []), transcript_id],
            })),
    })
);
