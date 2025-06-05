import { Routes, Route, Navigate } from "react-router-dom";
import SignIn from "../features/auth/pages/Sign-In";
import SignUp from "../features/auth/pages/SignUp";
import Dashboard from "../pages/Dashboard";
import ProtectedRoute from "./ProtectedRoute";
// import { SignUpPage } from "../features/auth/pages/SignUpPage";

const AppRoutes = () => {
    return (
        <Routes>
            <Route path="/" element={<SignIn />} />
            <Route path="/sign-up" element={<SignUp />} />
            {/* <Route path="/signup" element={<SignUp />} /> */}
            <Route
                path="/dashboard"
                element={
                    <ProtectedRoute>
                        <Dashboard />
                    </ProtectedRoute>
                }
            />
        </Routes>
    );
};

export default AppRoutes;
