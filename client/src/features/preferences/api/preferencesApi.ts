// src/features/preferences/api/preferencesApi.ts

import axios from "axios";
import type { UserPreferences } from "../../../types/types";

const USERS_BASE_URL = "http://localhost:5002/users";

export const fetchMyPreferences = async (): Promise<UserPreferences> => {
    const res = await axios.get(`${USERS_BASE_URL}/me/preferences`, {
        withCredentials: true,
    });
    if (!res.data?.success)
        throw new Error(res.data?.message || "Failed to load preferences");
    return res.data.preferences as UserPreferences;
};

export const patchMyPreferences = async (
    patch: Partial<UserPreferences>,
): Promise<UserPreferences> => {
    const res = await axios.patch(`${USERS_BASE_URL}/me/preferences`, patch, {
        withCredentials: true,
    });
    if (!res.data?.success)
        throw new Error(res.data?.message || "Failed to update preferences");
    return res.data.preferences as UserPreferences;
};
