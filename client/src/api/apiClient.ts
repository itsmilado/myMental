// src/api/apiClient.ts

import axios, {
    AxiosError,
    AxiosHeaders,
    type InternalAxiosRequestConfig,
} from "axios";

export const API_BASE_URL =
    (import.meta as any).env?.VITE_API_BASE_URL?.toString() ||
    "http://localhost:5002";

let csrfTokenCache: string | null = null;
let csrfTokenRequest: Promise<string> | null = null;

const CSRF_PROTECTED_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const CSRF_TOKEN_PATH = "/auth/csrf-token";

const setRequestHeader = (
    config: InternalAxiosRequestConfig,
    key: string,
    value: string,
) => {
    if (!config.headers) {
        config.headers = new AxiosHeaders();
    }

    if (config.headers instanceof AxiosHeaders) {
        config.headers.set(key, value);
    } else {
        const headers = new AxiosHeaders(config.headers as any);
        headers.set(key, value);
        config.headers = headers;
    }
};

const clearCsrfTokenCache = () => {
    csrfTokenCache = null;
    csrfTokenRequest = null;
};

const isCsrfTokenRequest = (config: InternalAxiosRequestConfig): boolean => {
    const url = config.url || "";
    return url === CSRF_TOKEN_PATH || url.endsWith(CSRF_TOKEN_PATH);
};

const fetchCsrfToken = async (): Promise<string> => {
    if (csrfTokenCache) {
        return csrfTokenCache;
    }

    if (csrfTokenRequest) {
        return csrfTokenRequest;
    }

    csrfTokenRequest = (async () => {
        const response = await axios.get<{
            success: boolean;
            csrfToken: string;
        }>(`${API_BASE_URL}${CSRF_TOKEN_PATH}`, {
            withCredentials: true,
        });

        const token = response.data?.csrfToken;

        if (!token) {
            throw new Error("Failed to fetch CSRF token.");
        }

        csrfTokenCache = token;
        return token;
    })();

    try {
        return await csrfTokenRequest;
    } finally {
        csrfTokenRequest = null;
    }
};

export const apiClient = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true,
});

apiClient.interceptors.request.use(
    async (config) => {
        const method = (config.method || "GET").toUpperCase();

        if (CSRF_PROTECTED_METHODS.has(method) && !isCsrfTokenRequest(config)) {
            const csrfToken = await fetchCsrfToken();
            setRequestHeader(config, "X-CSRF-Token", csrfToken);
        }

        return config;
    },
    (error) => Promise.reject(error),
);

apiClient.interceptors.response.use(
    (response) => response,
    (error: AxiosError<{ message?: string }>) => {
        const status = error.response?.status;
        const message = error.response?.data?.message?.toLowerCase() || "";

        if (
            status === 403 &&
            (message.includes("csrf") || message.includes("origin"))
        ) {
            clearCsrfTokenCache();
        }

        return Promise.reject(error);
    },
);

export const getApiErrorMessage = (
    error: unknown,
    fallback = "Request failed",
): string => {
    if (axios.isAxiosError(error)) {
        const axErr = error as AxiosError<{ message?: string }>;
        return axErr.response?.data?.message || axErr.message || fallback;
    }

    if (error instanceof Error) {
        return error.message || fallback;
    }

    return fallback;
};

export { clearCsrfTokenCache };
