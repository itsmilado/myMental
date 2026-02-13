import { create } from "zustand";
import { AuthState } from "../types/types";
import { fetchCurrentUser } from "../features/auth/api";

export const useAuthStore = create<AuthState>((set, get) => ({
    user: null,
    authReady: false,

    setUser: (user) => set({ user }),
    clearUser: () => set({ user: null, authReady: true }),

    hydrateUser: async () => {
        // avoid double-hydration if already ready
        if (get().authReady) return;

        try {
            const me = await fetchCurrentUser();
            set({ user: me.userData, authReady: true });
        } catch {
            // 401 or network: treat as logged out
            set({ user: null, authReady: true });
        }
    },
}));
