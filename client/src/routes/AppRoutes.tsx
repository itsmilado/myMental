import { Routes, Route, Navigate } from "react-router-dom";
import SignIn from "../features/auth/pages/Sign-In";
import ProtectedRoute from "./ProtectedRoute";
import Dashboard from "../features/dashboard/pages/DashboardPage";
// import { SignUpPage } from "../features/auth/pages/SignUpPage";

const AppRoutes = () => {
    return (
        <Routes>
            <Route path="/" element={<SignIn />} />
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
