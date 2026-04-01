// src/features/auth/api.ts

import type {
    User,
    TranscriptionOptions,
    TranscriptData,
    AuthResponse,
    Filters,
    SortState,
    OnlineTranscription,
    RestorePayload,
    AssemblyAiConnection,
    CreateAssemblyAiConnectionPayload,
    UpdateAssemblyAiConnectionPayload,
} from "../../types/types";
import {
    apiClient,
    API_BASE_URL,
    getApiErrorMessage,
} from "../../api/apiClient";

const TRANSCRIPTION_BASE_PATH = "/transcription";
const USER_BASE_PATH = "/users";

export interface StartTranscriptionResponse {
    success: boolean;
    jobId: string;
}

export type DeleteTranscriptionOptions = {
    deleteFromAssembly?: boolean;
    deleteTxtFile?: boolean;
    deleteAudioFile?: boolean;
};

export const startGoogleOAuth = (
    intent:
        | "signin"
        | "link"
        | "reauth_email"
        | "reauth_delete"
        | "reauth_unlink"
        | "reauth_assembly_connection" = "signin",
) => {
    const url = new URL(`${API_BASE_URL}/auth/google`);
    url.searchParams.set("intent", intent);
    window.location.assign(url.toString());
};

export const unlinkGoogleAccount = async (): Promise<User> => {
    try {
        const response = await apiClient.post(
            `${USER_BASE_PATH}/me/unlink-google`,
        );

        if (!response.data?.success) {
            throw new Error(
                response.data?.message || "Failed to remove Google sign-in.",
            );
        }

        return response.data.userData as User;
    } catch (error) {
        throw new Error(
            getApiErrorMessage(error, "Failed to remove Google sign-in."),
        );
    }
};

export const getUser = async (id: string): Promise<User> => {
    try {
        const response = await apiClient.get<User>(`${USER_BASE_PATH}/${id}`);
        return response.data;
    } catch (error) {
        throw new Error(getApiErrorMessage(error, "Failed to fetch user."));
    }
};

export const loginUser = async (
    email: string,
    password: string,
    rememberMe: boolean,
): Promise<AuthResponse> => {
    try {
        const response = await apiClient.post(`${USER_BASE_PATH}/login`, {
            email,
            password,
            rememberMe,
        });
        return response.data as AuthResponse;
    } catch (error) {
        throw new Error(getApiErrorMessage(error, "Login failed."));
    }
};

export const fetchCurrentUser = async (): Promise<AuthResponse> => {
    try {
        const response = await apiClient.get(`${USER_BASE_PATH}/me`);
        return response.data as AuthResponse;
    } catch (error) {
        throw new Error(
            getApiErrorMessage(error, "Failed to fetch current user."),
        );
    }
};

export const logoutUser = async (): Promise<void> => {
    try {
        await apiClient.post(`${USER_BASE_PATH}/logout`);
    } catch (error) {
        throw new Error(getApiErrorMessage(error, "Logout failed."));
    }
};

export const signupUser = async (
    first_name: string,
    last_name: string,
    email: string,
    password: string,
    repeat_password: string,
): Promise<AuthResponse> => {
    try {
        const response = await apiClient.post(`${USER_BASE_PATH}/signup`, {
            first_name,
            last_name,
            email,
            password,
            repeat_password,
        });
        return response.data as AuthResponse;
    } catch (error) {
        throw new Error(getApiErrorMessage(error, "Signup failed."));
    }
};

export const updateCurrentUser = async (payload: {
    first_name?: string;
    last_name?: string;
    email?: string;
}): Promise<User> => {
    try {
        const response = await apiClient.patch(`${USER_BASE_PATH}/me`, payload);

        if (!response.data?.success) {
            throw new Error(response.data?.message || "Update failed");
        }

        return response.data.userData as User;
    } catch (error) {
        throw new Error(getApiErrorMessage(error, "Update failed"));
    }
};

export const reauthCurrentUser = async (
    password: string,
): Promise<{ reauthenticatedAt: number; validForMs: number }> => {
    try {
        const response = await apiClient.post(`${USER_BASE_PATH}/me/reauth`, {
            password,
        });

        if (!response.data?.success) {
            throw new Error(response.data?.message || "Re-auth failed");
        }

        return {
            reauthenticatedAt: response.data.reauthenticatedAt as number,
            validForMs: response.data.validForMs as number,
        };
    } catch (error) {
        throw new Error(getApiErrorMessage(error, "Re-auth failed"));
    }
};

export const requestCurrentEmailConfirmation = async (): Promise<string> => {
    try {
        const response = await apiClient.post(
            `${USER_BASE_PATH}/me/confirm-email/request`,
        );

        if (!response.data?.success) {
            throw new Error(
                response.data?.message || "Failed to send confirmation email.",
            );
        }

        return (response.data?.message as string) || "Confirmation email sent.";
    } catch (error) {
        throw new Error(
            getApiErrorMessage(error, "Failed to send confirmation email."),
        );
    }
};

export const requestEmailChange = async (newEmail: string): Promise<string> => {
    try {
        const response = await apiClient.post(
            `${USER_BASE_PATH}/me/change-email`,
            {
                new_email: newEmail,
            },
        );

        if (!response.data?.success) {
            throw new Error(
                response.data?.message || "Email change request failed",
            );
        }

        return (response.data?.message as string) || "Confirmation email sent";
    } catch (error) {
        throw new Error(
            getApiErrorMessage(error, "Email change request failed"),
        );
    }
};

export const confirmEmail = async (token: string): Promise<User> => {
    try {
        const response = await apiClient.get(
            `${USER_BASE_PATH}/confirm-email`,
            {
                params: { token },
            },
        );

        if (!response.data?.success) {
            throw new Error(
                response.data?.message || "Email confirmation failed",
            );
        }

        return response.data.userData as User;
    } catch (error) {
        throw new Error(getApiErrorMessage(error, "Email confirmation failed"));
    }
};

export const deleteMyAccount = async (): Promise<string> => {
    try {
        const response = await apiClient.delete(`${USER_BASE_PATH}/me`);

        if (!response.data?.success) {
            throw new Error(response.data?.message || "Delete account failed");
        }

        return (response.data?.message as string) || "Account deleted";
    } catch (error) {
        throw new Error(getApiErrorMessage(error, "Delete account failed"));
    }
};

export const changeMyPassword = async (
    newPassword: string,
    currentPassword?: string,
): Promise<string> => {
    try {
        const response = await apiClient.post(
            `${USER_BASE_PATH}/me/change-password`,
            {
                new_password: newPassword,
                ...(currentPassword
                    ? { current_password: currentPassword }
                    : {}),
            },
        );

        if (!response.data?.success) {
            throw new Error(response.data?.message || "Password update failed");
        }

        return (response.data?.message as string) || "Password updated";
    } catch (error) {
        throw new Error(getApiErrorMessage(error, "Password update failed"));
    }
};

export const fetchMyAssemblyConnections = async (): Promise<
    AssemblyAiConnection[]
> => {
    try {
        const response = await apiClient.get(
            `${USER_BASE_PATH}/me/assemblyai-connections`,
        );

        if (!response.data?.success) {
            throw new Error(
                response.data?.message ||
                    "Failed to load AssemblyAI connections.",
            );
        }

        return (response.data?.connections || []) as AssemblyAiConnection[];
    } catch (error) {
        throw new Error(
            getApiErrorMessage(error, "Failed to load AssemblyAI connections."),
        );
    }
};

export const createMyAssemblyConnection = async (
    payload: CreateAssemblyAiConnectionPayload,
): Promise<AssemblyAiConnection> => {
    try {
        const response = await apiClient.post(
            `${USER_BASE_PATH}/me/assemblyai-connections`,
            payload,
        );

        if (!response.data?.success) {
            throw new Error(
                response.data?.message ||
                    "Failed to save AssemblyAI connection.",
            );
        }

        return response.data.connection as AssemblyAiConnection;
    } catch (error) {
        throw new Error(
            getApiErrorMessage(error, "Failed to save AssemblyAI connection."),
        );
    }
};

export const updateMyAssemblyConnection = async (
    id: number,
    payload: UpdateAssemblyAiConnectionPayload,
): Promise<AssemblyAiConnection> => {
    try {
        const response = await apiClient.patch(
            `${USER_BASE_PATH}/me/assemblyai-connections/${id}`,
            payload,
        );

        if (!response.data?.success) {
            throw new Error(
                response.data?.message ||
                    "Failed to update AssemblyAI connection.",
            );
        }

        return response.data.connection as AssemblyAiConnection;
    } catch (error) {
        throw new Error(
            getApiErrorMessage(
                error,
                "Failed to update AssemblyAI connection.",
            ),
        );
    }
};

export const deleteMyAssemblyConnection = async (
    id: number,
): Promise<AssemblyAiConnection> => {
    try {
        const response = await apiClient.delete(
            `${USER_BASE_PATH}/me/assemblyai-connections/${id}`,
        );

        if (!response.data?.success) {
            throw new Error(
                response.data?.message ||
                    "Failed to remove AssemblyAI connection.",
            );
        }

        return response.data.connection as AssemblyAiConnection;
    } catch (error) {
        throw new Error(
            getApiErrorMessage(
                error,
                "Failed to remove AssemblyAI connection.",
            ),
        );
    }
};

export const setDefaultMyAssemblyConnection = async (
    id: number,
): Promise<AssemblyAiConnection> => {
    try {
        const response = await apiClient.post(
            `${USER_BASE_PATH}/me/assemblyai-connections/${id}/set-default`,
            {},
        );

        if (!response.data?.success) {
            throw new Error(
                response.data?.message ||
                    "Failed to update default AssemblyAI connection.",
            );
        }

        return response.data.connection as AssemblyAiConnection;
    } catch (error) {
        throw new Error(
            getApiErrorMessage(
                error,
                "Failed to update default AssemblyAI connection.",
            ),
        );
    }
};

export const requestPasswordReset = async (
    email: string,
): Promise<{ success: boolean; message: string }> => {
    try {
        const response = await apiClient.post(`/users/forgot-password`, {
            email,
        });

        if (!response.data?.success) {
            throw new Error(
                response.data?.message ||
                    "Failed to send password reset email.",
            );
        }

        return response.data as { success: boolean; message: string };
    } catch (error) {
        throw new Error(
            getApiErrorMessage(error, "Failed to send password reset email."),
        );
    }
};

export const resetPassword = async (
    token: string,
    newPassword: string,
): Promise<{ success: boolean; message: string }> => {
    try {
        const response = await apiClient.post(`/users/reset-password`, {
            token,
            new_password: newPassword,
        });

        if (!response.data?.success) {
            throw new Error(response.data?.message || "Password reset failed");
        }

        return response.data as { success: boolean; message: string };
    } catch (error) {
        throw new Error(getApiErrorMessage(error, "Password reset failed"));
    }
};

// SSE-based background job starter
export const startTranscriptionJob = async (
    file: File,
    options: Partial<TranscriptionOptions>,
): Promise<StartTranscriptionResponse> => {
    try {
        const formData = new FormData();

        const modified = new Date(file.lastModified);
        const fileModifiedDate = modified.toISOString();

        formData.append("fileModifiedDate", fileModifiedDate);
        formData.append("options", JSON.stringify(options));
        Object.entries(options).forEach(([key, value]) => {
            formData.append(key, value.toString());
        });
        formData.append("audioFile", file);

        const { data } = await apiClient.post<StartTranscriptionResponse>(
            `${TRANSCRIPTION_BASE_PATH}/start`,
            formData,
            {
                headers: { "Content-Type": "multipart/form-data" },
            },
        );

        return data;
    } catch (error) {
        throw new Error(
            getApiErrorMessage(error, "Failed to start transcription job."),
        );
    }
};

export const getTranscriptionProgressUrl = (jobId: string): string => {
    const base = API_BASE_URL.replace(/\/$/, "");
    return `${base}${TRANSCRIPTION_BASE_PATH}/progress/${jobId}`;
};

// fetch all transcripts for a user
export const fetchUserTranscripts = async (
    filters: Filters = {},
    sort: SortState = { orderBy: "file_recorded_at", direction: "desc" },
): Promise<TranscriptData[]> => {
    try {
        const params = {
            ...filters,
            order_by: sort.orderBy,
            direction: sort.direction,
        };

        const response = await apiClient.get(
            `${TRANSCRIPTION_BASE_PATH}/filtered_transcriptions`,
            {
                params,
            },
        );

        if (!response.data?.success) {
            throw new Error(
                response.data?.message || "Failed to fetch transcriptions",
            );
        }

        return response.data.data as TranscriptData[];
    } catch (error) {
        throw new Error(
            getApiErrorMessage(error, "Failed to fetch transcriptions"),
        );
    }
};

export const exportTranscription = async (
    transcriptId: string,
    format: "txt" | "pdf" | "docx",
    fallbackFileName?: string,
): Promise<{ blob: Blob; fileName: string }> => {
    try {
        const res = await apiClient.get(
            `${TRANSCRIPTION_BASE_PATH}/export/${transcriptId}`,
            {
                params: { format },
                responseType: "blob",
            },
        );

        const cd = (res.headers as any)["content-disposition"];
        let fileName = fallbackFileName
            ? `${fallbackFileName.replace(/\.[^/.]+$/, "")}-${transcriptId}.${format}`
            : `${transcriptId}.${format}`;

        if (cd) {
            const match = cd.match(/filename="?([^"]+)"?/);
            if (match) fileName = match[1];
        }

        return { blob: res.data as Blob, fileName };
    } catch (error) {
        throw new Error(
            getApiErrorMessage(error, "Failed to export transcription"),
        );
    }
};

export const deleteTranscription = async (
    id: string,
    options?: DeleteTranscriptionOptions,
): Promise<string> => {
    try {
        const response = await apiClient.delete(
            `${TRANSCRIPTION_BASE_PATH}/delete/dbTranscription/${id}`,
            { data: options ?? {} },
        );

        if (!response.data?.success) {
            throw new Error(response.data?.message || "Delete failed");
        }

        return response.data.message as string;
    } catch (error) {
        throw new Error(getApiErrorMessage(error, "Delete failed"));
    }
};

export const fetchAssemblyTranscriptions = async (
    transcriptId: string,
): Promise<OnlineTranscription[]> => {
    try {
        const params = transcriptId ? { transcript_id: transcriptId } : {};

        const response = await apiClient.get(
            `${TRANSCRIPTION_BASE_PATH}/assemblyai/history`,
            {
                params,
            },
        );

        if (!response.data?.success) {
            throw new Error(
                response.data?.message ||
                    "Failed to fetch AssemblyAI transcriptions",
            );
        }

        return response.data.data as OnlineTranscription[];
    } catch (error) {
        throw new Error(
            getApiErrorMessage(
                error,
                "Failed to fetch AssemblyAI transcriptions",
            ),
        );
    }
};

export const fetchTranscriptionById = async (
    id: string,
): Promise<TranscriptData> => {
    try {
        const response = await apiClient.get(
            `${TRANSCRIPTION_BASE_PATH}/by_id/${id}`,
        );

        if (!response.data?.success) {
            throw new Error(
                response.data?.message || "Failed to fetch transcription",
            );
        }

        return response.data.data as TranscriptData;
    } catch (error) {
        throw new Error(
            getApiErrorMessage(error, "Failed to fetch transcription"),
        );
    }
};

export const restoreTranscription = async (
    payload: RestorePayload,
): Promise<TranscriptData> => {
    try {
        const { data } = await apiClient.post(
            `${TRANSCRIPTION_BASE_PATH}/restore`,
            payload,
        );

        if (!data?.success) {
            throw new Error(data?.message || "Failed to restore transcription");
        }

        return data.data as TranscriptData;
    } catch (error) {
        throw new Error(
            getApiErrorMessage(error, "Failed to restore transcription"),
        );
    }
};

export const deleteAssemblyTranscription = async (
    transcriptId: string,
): Promise<string> => {
    try {
        const response = await apiClient.delete(
            `${TRANSCRIPTION_BASE_PATH}/assemblyai/delete/${transcriptId}`,
        );

        if (!response.data?.success) {
            throw new Error(response.data?.message || "Delete failed");
        }

        return response.data.message as string;
    } catch (error) {
        throw new Error(getApiErrorMessage(error, "Delete failed"));
    }
};

export const getAudioStreamUrl = (fileName: string): string => {
    const base = API_BASE_URL.replace(/\/$/, "");
    return `${base}${TRANSCRIPTION_BASE_PATH}/audio/${encodeURIComponent(fileName)}`;
};
