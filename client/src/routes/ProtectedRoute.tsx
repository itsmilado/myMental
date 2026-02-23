// src/routes/ProtectedRoute.tsx

import React, { useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";

type ProtectedRouteProps = {
    children: React.ReactNode;
};

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
    const user = useAuthStore((state) => state.user);
    const authReady = useAuthStore((state) => state.authReady);
    const hydrateUser = useAuthStore((state) => state.hydrateUser);

    // Hydrate session user on first mount
    useEffect(() => {
        hydrateUser();
    }, [hydrateUser]);

    // Block rendering until auth state is known
    if (!authReady) {
        return null; // Can replace with full-page loader later
    }

    // Redirect only after hydration completes
    if (!user) {
        return <Navigate to="/" replace />;
    }

    return <>{children}</>;
};

export default ProtectedRoute;
