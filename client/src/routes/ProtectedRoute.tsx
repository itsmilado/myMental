import React from "react";
import { Navigate } from "react-router-dom";

type Props = {
    children: React.ReactNode;
};

const ProtectedRoute = ({ children }: Props) => {
    const isAuthenticated = !!localStorage.getItem("user"); // or check a token/cookie
    return isAuthenticated ? <>{children}</> : <Navigate to="/" />;
};

export default ProtectedRoute;
