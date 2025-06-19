// src/features/auth/api.ts

import axios from "axios";
import {
    User,
    transcriptUploadResponse,
    TranscriptionOptions,
    TranscriptData,
    AuthResponse,
    Filters,
    SortState,
} from "../../types/types";

axios.defaults.withCredentials = true;

export const getUser = async (id: string): Promise<User> => {
    try {
        const response = await axios.get<User>(
            `http://localhost:5000/users/${id}`
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

export const uploadAudio = async (
    file: File,
    options: Partial<TranscriptionOptions>
): Promise<transcriptUploadResponse> => {
    const formData = new FormData();

    const modified = new Date(file.lastModified);
    const fileModifiedDate = modified.toISOString(); // e.g. "2018-12-13T00:00:00.000Z"
    console.log("File Modified Date:", fileModifiedDate);

    formData.append("fileModifiedDate", fileModifiedDate);
    formData.append("options", JSON.stringify(options));
    Object.entries(options).forEach(([key, value]) => {
        formData.append(key, value.toString());
    });
    formData.append("audioFile", file);

    const response = await axios.post<transcriptUploadResponse>(
        "http://localhost:5002/transcription/upload",
        formData,
        {
            headers: {
                "Content-Type": "multipart/form-data",
            },
        }
    );
    return response.data;
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
    format: "txt" | "pdf" | "docx"
): Promise<{ blob: Blob; fileName: string }> => {
    const res = await fetch(
        `http://localhost:5002/transcription/export/${transcriptId}?format=${format}`,
        { credentials: "include" }
    );
    if (!res.ok) {
        throw new Error("Export failed");
    }
    const blob = await res.blob();
    // Try to extract filename from header
    const cd = res.headers.get("Content-Disposition");
    let fileName = `${transcriptId}.${format}`;
    if (cd) {
        const match = cd.match(/filename="?([^"]+)"?/);
        if (match) fileName = match[1];
    }
    return { blob, fileName };
};
