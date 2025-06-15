import { Routes, Route, Navigate } from "react-router-dom";
import SignIn from "../features/auth/pages/Sign-In";
import SignUp from "../features/auth/pages/SignUp";
import Dashboard from "../pages/Dashboard";
import ProtectedRoute from "./ProtectedRoute";
import { UploadAudioPage } from "../features/transcription/pages/UploadAudioPage";
import TranscriptionHistoryPage from "../features/transcription/pages/TranscriptionHistoryPage";
import TranscriptionDetailPage from "../features/transcription/pages/TranscriptionDetailPage";
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
                    element={<UploadAudioPage />}
                />
                <Route
                    path="transcriptions/history"
                    element={<TranscriptionHistoryPage />}
                />
                <Route
                    path="/dashboard/transcriptions/:id"
                    element={<TranscriptionDetailPage />}
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
