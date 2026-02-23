// src/api/apiClient.ts

import axios, { type AxiosError } from "axios";

export const API_BASE_URL =
    (import.meta as any).env?.VITE_API_BASE_URL?.toString() ||
    "http://localhost:5002";

export const apiClient = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true,
});

export const getApiErrorMessage = (
    error: unknown,
    fallback = "Request failed",
): string => {
    if (axios.isAxiosError(error)) {
        const axErr = error as AxiosError<any>;
        return axErr.response?.data?.message || axErr.message || fallback;
    }
    if (error instanceof Error) return error.message || fallback;
    return fallback;
};
