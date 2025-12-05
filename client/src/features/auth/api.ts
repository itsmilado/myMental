// src/features/auth/api.ts

import axios from "axios";
import {
    User,
    TranscriptionOptions,
    TranscriptData,
    AuthResponse,
    Filters,
    SortState,
    OnlineTranscription,
    RestorePayload,
} from "../../types/types";

axios.defaults.withCredentials = true;

const TRANSCRIPTION_BASE_URL = "http://localhost:5002/transcription";

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
    try {
        const response = await axios.get<User>(
            `http://localhost:5002/users/${id}`
        );
        return response.data;
    } catch (error) {
        console.error("Error fetching user:", error);
        throw error;
    }
};

export const loginUser = async (
    email: string,
    password: string
): Promise<AuthResponse> => {
    const response = await axios.post("http://localhost:5002/users/login", {
        email,
        password,
    });
    return response.data as AuthResponse;
};

export const fetchCurrentUser = async (): Promise<AuthResponse> => {
    const response = await axios.get("http://localhost:5002/users/me");
    return response.data as AuthResponse;
};

export const logoutUser = async () => {
    await axios.post("http://localhost:5002/users/logout");
};

export const signupUser = async (
    first_name: string,
    last_name: string,
    email: string,
    password: string,
    repeat_password: string
): Promise<AuthResponse> => {
    const response = await axios.post("http://localhost:5000/users/signup", {
        first_name,
        last_name,
        email,
        password,
        repeat_password,
    });
    return response.data as AuthResponse;
};

// SSE-based background job starter
export const startTranscriptionJob = async (
    file: File,
    options: Partial<TranscriptionOptions>
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

    const { data } = await axios.post<StartTranscriptionResponse>(
        `${TRANSCRIPTION_BASE_URL}/start`,
        formData,
        {
            headers: {
                "Content-Type": "multipart/form-data",
            },
        }
    );

    return data;
};

export const getTranscriptionProgressUrl = (jobId: string): string => {
    return `${TRANSCRIPTION_BASE_URL}/progress/${jobId}`;
};

// fetch all transcripts for a user

export const fetchUserTranscripts = async (
    filters: Filters = {},
    sort: SortState = { orderBy: "file_recorded_at", direction: "desc" }
): Promise<TranscriptData[]> => {
    const params = {
        ...filters,
        order_by: sort.orderBy,
        direction: sort.direction,
    };
    const response = await axios.get(
        "http://localhost:5002/transcription/filtered_transcriptions",
        { params }
    );
    if (response.data.success) return response.data.data as TranscriptData[];
    throw new Error(response.data.message || "Failed to fetch transcriptions");
};

export const exportTranscription = async (
    transcriptId: string,
    format: "txt" | "pdf" | "docx",
    fallbackFileName?: string
): Promise<{ blob: Blob; fileName: string }> => {
    const res = await axios.get(
        `http://localhost:5002/transcription/export/${transcriptId}?format=${format}`,
        { responseType: "blob" }
    );
    // Try to extract filename from header
    const cd = res.headers["content-disposition"];
    let fileName = fallbackFileName
        ? `${fallbackFileName.replace(
              /\.[^/.]+$/,
              ""
          )}-${transcriptId}.${format}`
        : `${transcriptId}.${format}`;
    if (cd) {
        const match = cd.match(/filename="?([^"]+)"?/);
        if (match) fileName = match[1];
    }
    return { blob: res.data, fileName };
};

export const deleteTranscription = async (
    id: string,
    options?: DeleteTranscriptionOptions
): Promise<string> => {
    try {
        // NOTE: axios.delete with a body must use `data` inside the config object
        const response = await axios.delete(
            `http://localhost:5002/transcription/delete/dbTranscription/${id}`,
            {
                data: options ?? {},
            }
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
    transcriptId: string
): Promise<OnlineTranscription[]> => {
    const params = transcriptId ? { transcript_id: transcriptId } : {};
    const response = await axios.get(
        "http://localhost:5002/transcription/assemblyai/history",
        { params }
    );

    if (!response.data?.success) {
        throw new Error(
            response.data?.message ||
                "Failed to fetch AssemblyAI transcriptions"
        );
    }
    return response.data.data as OnlineTranscription[];
};

export const restoreTranscription = async (
    payload: RestorePayload
): Promise<TranscriptData> => {
    const { data } = await axios.post(
        "http://localhost:5002/transcription/restore",
        payload
    );
    return data.data;
};

export const deleteAssemblyTranscription = async (
    transcriptId: string
): Promise<string> => {
    try {
        const response = await axios.delete(
            `http://localhost:5002/transcription/assemblyai/delete/${transcriptId}`
        );
        if (!response.data.success) {
            throw new Error(response.data.message || "Delete failed");
        }
        return response.data.message;
    } catch (error: any) {
        const message =
            error.response?.data?.message || error.message || "Delete failed";
        throw new Error(message);
    }
};
