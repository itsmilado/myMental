import { create } from "zustand";
import { User, AuthState } from "../types/types";

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    setUser: (user: User | null) => set({ user }),
    clearUser: () => set({ user: null }),
}));
