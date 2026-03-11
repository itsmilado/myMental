// src/routes/AppRoutes.tsx

import { Routes, Route } from "react-router-dom";

import LandingPage from "../features/landing/pages/LandingPage";
import SignIn from "../features/auth/pages/Sign-In";
import SignUp from "../features/auth/pages/SignUp";
import Dashboard from "../pages/Dashboard";
import ProtectedRoute from "./ProtectedRoute";

import { UploadAudioPage } from "../features/transcription/pages/UploadAudioPage";
import TranscriptionHistoryPage from "../features/transcription/pages/TranscriptionHistoryPage";
import TranscriptionDetailPage from "../features/transcription/pages/TranscriptionDetailPage";
import OfflineHistoryPage from "../features/transcription/pages/OfflineHistoryPage";
import OnlineHistoryPage from "../features/transcription/pages/OnlineHistoryPage";

import AccountPage from "../features/account/pages/AccountPage";
import PreferencesPage from "../features/preferences/pages/PreferencesPage";
import SettingsPage from "../features/settings/pages/SettingsPage";
import ConfirmEmailPage from "../features/account/pages/ConfirmEmailPage";
import ResetPassword from "../features/auth/pages/ResetPassword";
import OAuthCallback from "../features/auth/pages/OAuthCallback";
import PublicLayout from "../features/public/layout/PublicLayout";

const AppRoutes = () => {
    return (
        <Routes>
            {/* Public landing */}
            <Route path="/" element={<LandingPage />} />

            {/* Shared public auth shell */}
            <Route element={<PublicLayout />}>
                <Route path="/sign-in" element={<SignIn />} />
                <Route path="/sign-up" element={<SignUp />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/oauth/callback" element={<OAuthCallback />} />
            </Route>

            {/* Other public routes */}
            <Route path="/confirm-email" element={<ConfirmEmailPage />} />

            {/* Protected dashboard routes */}
            <Route
                path="/dashboard"
                element={
                    <ProtectedRoute>
                        <Dashboard />
                    </ProtectedRoute>
                }
            >
                {/* Account */}
                <Route path="account" element={<AccountPage />} />
                <Route path="preferences" element={<PreferencesPage />} />
                <Route path="settings" element={<SettingsPage />} />

                {/* Transcriptions */}
                <Route
                    path="transcriptions/upload"
                    element={<UploadAudioPage />}
                />
                <Route
                    path="transcriptions/history"
                    element={<TranscriptionHistoryPage />}
                >
                    <Route path="offline" element={<OfflineHistoryPage />} />
                    <Route path="online" element={<OnlineHistoryPage />} />
                    <Route index element={<OfflineHistoryPage />} />
                </Route>
                <Route
                    path="transcriptions/:id"
                    element={<TranscriptionDetailPage />}
                />
            </Route>
        </Routes>
    );
};

export default AppRoutes;
