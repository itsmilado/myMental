// src/store/useAssemblyTranscriptionStore.ts

import { create } from "zustand";
import { AssemblyTranscriptionState } from "../types/types";

export const useAssemblyTranscriptionStore = create<AssemblyTranscriptionState>(
    (set) => ({
        list: [],
        loading: false,
        error: null,
        searchId: "",
        setList: (data) => set({ list: data }),
        setLoading: (loading) => set({ loading }),
        setError: (error) => set({ error }),
        setSearchId: (id) => set({ searchId: id }),
    })
);
