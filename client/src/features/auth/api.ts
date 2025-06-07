import axios from "axios";
import { User } from "../../types/types";

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

export const loginUser = async (email: string, password: string) => {
    const response = await axios.post("http://localhost:5000/users/login", {
        email,
        password,
    });
    return response.data.data;
};

export const logoutUser = async () => {
    await axios.post("http://localhost:5000/users/logout");
};
