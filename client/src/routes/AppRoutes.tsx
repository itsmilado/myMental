import { Routes, Route, Navigate } from "react-router-dom";
import SignIn from "../features/auth/pages/Sign-In";
import SignUp from "../features/auth/pages/SignUp";
import Dashboard from "../pages/Dashboard";
import ProtectedRoute from "./ProtectedRoute";
import { TranscriptionPage } from "../features/transcription/pages/TranscriptionPage";
import TranscriptionHistoryPage from "../features/transcription/pages/TranscriptionHistoryPage";
// import { SignUpPage } from "../features/auth/pages/SignUpPage";

const AppRoutes = () => {
    return (
        <Routes>
            {/* Public routes */}
            <Route path="/" element={<SignIn />} />
            <Route path="/sign-up" element={<SignUp />} />

            {/* Protected dashboard routes */}
            <Route
                path="/dashboard"
                element={
                    <ProtectedRoute>
                        <Dashboard />
                    </ProtectedRoute>
                }
            >
                <Route
                    path="transcriptions/upload"
                    element={<TranscriptionPage />}
                />
                <Route
                    path="transcriptions/history"
                    element={<TranscriptionHistoryPage />}
                />
                <Route
                    index
                    element={<Navigate to="transcriptions/history" replace />}
                />
            </Route>
        </Routes>
    );
};

export default AppRoutes;
