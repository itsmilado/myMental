// src/store/usePreferencesStore.ts

import { create } from "zustand";
import type { DeepPartial, UserPreferences } from "../types/types";
import {
    fetchMyPreferences,
    patchMyPreferences,
} from "../features/preferences/api/preferencesApi";

type PreferencesState = {
    preferences: UserPreferences | null;
    loading: boolean;
    error: string | null;

    load: () => Promise<void>;
    patch: (patch: DeepPartial<UserPreferences>) => Promise<void>;
};

export const usePreferencesStore = create<PreferencesState>((set, get) => ({
    preferences: null,
    loading: false,
    error: null,

    load: async () => {
        set({ loading: true, error: null });
        try {
            const prefs = await fetchMyPreferences();
            set({ preferences: prefs, loading: false });
        } catch (e: any) {
            set({
                error: e?.message || "Failed to load preferences",
                loading: false,
            });
        }
    },

    patch: async (patch: DeepPartial<UserPreferences>) => {
        const prev = get().preferences;
        if (!prev) return;

        const optimistic: UserPreferences = {
            ...prev,
            ...patch,
            appearance: patch.appearance
                ? { ...prev.appearance, ...patch.appearance }
                : prev.appearance,
            transcription: patch.transcription
                ? { ...prev.transcription, ...patch.transcription }
                : prev.transcription,
            ai: patch.ai ? { ...prev.ai, ...patch.ai } : prev.ai,
        };

        set({ preferences: optimistic, error: null });

        try {
            const saved = await patchMyPreferences(patch);
            set({ preferences: saved });
        } catch (e: any) {
            set({
                preferences: prev,
                error: e?.message || "Failed to save preferences",
            });
            throw e;
        }
    },
}));
