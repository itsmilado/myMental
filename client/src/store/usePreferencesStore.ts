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
    loaded: boolean;
    error: string | null;

    load: () => Promise<void>;
    patch: (patch: DeepPartial<UserPreferences>) => Promise<void>;
};

let preferencesLoadPromise: Promise<void> | null = null;

export const usePreferencesStore = create<PreferencesState>((set, get) => ({
    preferences: null,
    loading: false,
    loaded: false,
    error: null,

    /*
    - purpose: hydrate preferences once and dedupe concurrent boot-time loads
    - behavior:
      - skips duplicate loads after first resolution
      - reuses the same in-flight request across callers
    */
    load: async () => {
        const state = get();

        if (state.loaded) {
            return;
        }

        if (state.loading && preferencesLoadPromise) {
            await preferencesLoadPromise;
            return;
        }

        set({ loading: true, error: null });

        preferencesLoadPromise = (async () => {
            try {
                const prefs = await fetchMyPreferences();

                set({
                    preferences: prefs,
                    loading: false,
                    loaded: true,
                    error: null,
                });
            } catch (e: any) {
                set({
                    error: e?.message || "Failed to load preferences",
                    loading: false,
                    loaded: true,
                });
            }
        })();

        try {
            await preferencesLoadPromise;
        } finally {
            preferencesLoadPromise = null;
        }
    },

    /*
    - purpose: apply an optimistic preferences patch while preserving hydration state
    - behavior:
      - loads preferences first if missing
      - rolls back optimistic state on patch failure
    */
    patch: async (patch: DeepPartial<UserPreferences>) => {
        if (!get().preferences) {
            await get().load();
        }

        const prev = get().preferences;

        if (!prev) {
            throw new Error("Preferences are not loaded");
        }

        const optimistic: UserPreferences = {
            ...prev,
            ...patch,
            appearance: patch.appearance
                ? { ...prev.appearance, ...patch.appearance }
                : prev.appearance,
            transcription: patch.transcription
                ? {
                      ...prev.transcription,
                      ...patch.transcription,
                      speakerIdentification: patch.transcription
                          .speakerIdentification
                          ? {
                                ...prev.transcription.speakerIdentification,
                                ...patch.transcription.speakerIdentification,
                            }
                          : prev.transcription.speakerIdentification,
                  }
                : prev.transcription,
            ai: patch.ai ? { ...prev.ai, ...patch.ai } : prev.ai,
        };

        set({
            preferences: optimistic,
            error: null,
            loaded: true,
        });

        try {
            const saved = await patchMyPreferences(patch);

            set({
                preferences: saved,
                error: null,
                loaded: true,
            });
        } catch (e: any) {
            set({
                preferences: prev,
                error: e?.message || "Failed to save preferences",
                loaded: true,
            });
            throw e;
        }
    },
}));
