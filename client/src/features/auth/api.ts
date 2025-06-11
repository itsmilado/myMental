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
    return response.data;
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
) => {
    const response = await axios.post("http://localhost:5000/users/signup", {
        first_name,
        last_name,
        email,
        password,
        repeat_password,
    });
    return response.data;
};
