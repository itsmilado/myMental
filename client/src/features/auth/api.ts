import axios from "axios";
import {
    User,
    TranscriptData,
    TranscriptionOptions,
    AuthResponse,
} from "../../types/types";

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
    const response = await axios.post("http://localhost:5000/users/login", {
        email,
        password,
    });
    return response.data as AuthResponse;
};

export const logoutUser = async () => {
    await axios.post("http://localhost:5000/users/logout");
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
    options: TranscriptionOptions
): Promise<TranscriptData> => {
    const formData = new FormData();
    formData.append("file", file);

    const modified = new Date(file.lastModified);
    const fileModifiedDate = modified.toISOString().split("T")[0]; // "YYYY-MM-DD"
    console.log("File Modified Date:", fileModifiedDate);

    formData.append("fileModifiedDate", fileModifiedDate);
    formData.append("options", JSON.stringify(options));

    const response = await axios.post<TranscriptData>(
        "http://localhost:5000/transcription/upload",
        formData,
        {
            headers: {
                "Content-Type": "multipart/form-data",
            },
        }
    );
    return response.data;
};
