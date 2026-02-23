// src/features/preferences/api/preferencesApi.ts

import type { UserPreferences } from "../../../types/types";
import { apiClient } from "../../../api/apiClient";

export const fetchMyPreferences = async (): Promise<UserPreferences> => {
    const res = await apiClient.get(`/users/me/preferences`);
    if (!res.data?.success)
        throw new Error(res.data?.message || "Failed to load preferences");
    return res.data.preferences as UserPreferences;
};

export const patchMyPreferences = async (
    patch: Partial<UserPreferences>,
): Promise<UserPreferences> => {
    const res = await apiClient.patch(`/users/me/preferences`, patch);
    if (!res.data?.success)
        throw new Error(res.data?.message || "Failed to update preferences");
    return res.data.preferences as UserPreferences;
};
