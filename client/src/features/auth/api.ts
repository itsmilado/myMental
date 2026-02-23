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
} from "../../types/types";
import { apiClient, API_BASE_URL } from "../../api/apiClient";

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

export const getUser = async (id: string): Promise<User> => {
    const response = await apiClient.get<User>(`${USER_BASE_PATH}/${id}`);
    return response.data;
};

export const loginUser = async (
    email: string,
    password: string,
): Promise<AuthResponse> => {
    const response = await apiClient.post(`${USER_BASE_PATH}/login`, {
        email,
        password,
    });
    return response.data as AuthResponse;
};

export const fetchCurrentUser = async (): Promise<AuthResponse> => {
    const response = await apiClient.get(`${USER_BASE_PATH}/me`);
    return response.data as AuthResponse;
};

export const logoutUser = async (): Promise<void> => {
    await apiClient.post(`${USER_BASE_PATH}/logout`);
};

export const signupUser = async (
    first_name: string,
    last_name: string,
    email: string,
    password: string,
    repeat_password: string,
): Promise<AuthResponse> => {
    const response = await apiClient.post(`${USER_BASE_PATH}/signup`, {
        first_name,
        last_name,
        email,
        password,
        repeat_password,
    });
    return response.data as AuthResponse;
};

export const updateCurrentUser = async (payload: {
    first_name?: string;
    last_name?: string;
    email?: string;
}): Promise<User> => {
    const response = await apiClient.patch(`${USER_BASE_PATH}/me`, payload);
    if (!response.data?.success)
        throw new Error(response.data?.message || "Update failed");
    return response.data.userData as User;
};

export const reauthCurrentUser = async (
    password: string,
): Promise<{ reauthenticatedAt: number; validForMs: number }> => {
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
};

export const requestEmailChange = async (newEmail: string): Promise<string> => {
    const response = await apiClient.post(`${USER_BASE_PATH}/me/change-email`, {
        new_email: newEmail,
    });

    if (!response.data?.success) {
        throw new Error(
            response.data?.message || "Email change request failed",
        );
    }

    return (response.data?.message as string) || "Confirmation email sent";
};

export const confirmEmail = async (token: string): Promise<User> => {
    const response = await apiClient.get(`${USER_BASE_PATH}/confirm-email`, {
        params: { token },
    });

    if (!response.data?.success) {
        throw new Error(response.data?.message || "Email confirmation failed");
    }

    return response.data.userData as User;
};

export const deleteMyAccount = async (): Promise<string> => {
    const response = await apiClient.delete(`${USER_BASE_PATH}/me`);

    if (!response.data?.success) {
        throw new Error(response.data?.message || "Delete account failed");
    }

    return (response.data?.message as string) || "Account deleted";
};

export async function changeMyPassword(newPassword: string): Promise<string> {
    const res = await apiClient.post(`${USER_BASE_PATH}/me/change-password`, {
        new_password: newPassword,
    });

    if (res.data?.success === false) {
        throw new Error(res.data?.message || "Password update failed");
    }

    return (res.data?.message as string) || "Password updated";
}

// SSE-based background job starter
export const startTranscriptionJob = async (
    file: File,
    options: Partial<TranscriptionOptions>,
): Promise<StartTranscriptionResponse> => {
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

    if (response.data?.success) return response.data.data as TranscriptData[];
    throw new Error(response.data?.message || "Failed to fetch transcriptions");
};

export const exportTranscription = async (
    transcriptId: string,
    format: "txt" | "pdf" | "docx",
    fallbackFileName?: string,
): Promise<{ blob: Blob; fileName: string }> => {
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
};

export const deleteTranscription = async (
    id: string,
    options?: DeleteTranscriptionOptions,
): Promise<string> => {
    try {
        // axios.delete with a body must use `data` inside config
        const response = await apiClient.delete(
            `${TRANSCRIPTION_BASE_PATH}/delete/dbTranscription/${id}`,
            { data: options ?? {} },
        );

        if (!response.data?.success) {
            throw new Error(response.data?.message || "Delete failed");
        }

        return response.data.message as string;
    } catch (error: any) {
        const message =
            error?.response?.data?.message || error.message || "Delete failed";
        throw new Error(message);
    }
};

export const fetchAssemblyTranscriptions = async (
    transcriptId: string,
): Promise<OnlineTranscription[]> => {
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
};

export const fetchTranscriptionById = async (
    id: string,
): Promise<TranscriptData> => {
    const res = await apiClient.get(`${TRANSCRIPTION_BASE_PATH}/by_id/${id}`);

    if (res.data?.success) return res.data.data as TranscriptData;
    throw new Error(res.data?.message || "Failed to fetch transcription");
};

export const restoreTranscription = async (
    payload: RestorePayload,
): Promise<TranscriptData> => {
    const { data } = await apiClient.post(
        `${TRANSCRIPTION_BASE_PATH}/restore`,
        payload,
    );
    return data.data as TranscriptData;
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
    } catch (error: any) {
        const message =
            error?.response?.data?.message || error.message || "Delete failed";
        throw new Error(message);
    }
};

export const getAudioStreamUrl = (fileName: string): string => {
    const base = API_BASE_URL.replace(/\/$/, "");
    return `${base}${TRANSCRIPTION_BASE_PATH}/audio/${encodeURIComponent(fileName)}`;
};
