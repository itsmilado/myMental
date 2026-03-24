// src/features/preferences/api/preferencesApi.ts

import type { UserPreferences, DeepPartial } from "../../../types/types";
import { apiClient, getApiErrorMessage } from "../../../api/apiClient";

export const fetchMyPreferences = async (): Promise<UserPreferences> => {
    try {
        const res = await apiClient.get(`/users/me/preferences`);

        if (!res.data?.success) {
            throw new Error(res.data?.message || "Failed to load preferences");
        }

        return res.data.preferences as UserPreferences;
    } catch (error) {
        throw new Error(
            getApiErrorMessage(error, "Failed to load preferences"),
        );
    }
};

export const patchMyPreferences = async (
    patch: DeepPartial<UserPreferences>,
): Promise<UserPreferences> => {
    try {
        const res = await apiClient.patch(`/users/me/preferences`, patch);

        if (!res.data?.success) {
            throw new Error(
                res.data?.message || "Failed to update preferences",
            );
        }

        return res.data.preferences as UserPreferences;
    } catch (error) {
        throw new Error(
            getApiErrorMessage(error, "Failed to update preferences"),
        );
    }
};
