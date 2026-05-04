// src/routes/AppRoutes.tsx

import { Routes, Route, Navigate } from "react-router-dom";

import DocumentTitle from "../components/global/DocumentTitle";

import LandingPage from "../pages/LandingPage";
import SignIn from "../features/auth/pages/Sign-In";
import SignUp from "../features/auth/pages/SignUp";
import Dashboard from "../components/global/Dashboard";
import ProtectedRoute from "./ProtectedRoute";

import { UploadAudioPage } from "../features/transcription/pages/UploadAudioPage";
import TranscriptionHistoryPage from "../features/transcription/pages/TranscriptionHistoryPage";
import TranscriptionDetailPage from "../features/transcription/pages/TranscriptionDetailPage";
import { AppHistoryPage } from "../features/transcription/pages/history/AppHistoryPage";
import { AssemblyAIHistoryPage } from "../features/transcription/pages/history/AssemblyAIHistoryPage";

import AccountPage from "../features/account/pages/AccountPage";
import PreferencesPage from "../features/preferences/pages/PreferencesPage";
import ConfirmEmailPage from "../features/account/pages/ConfirmEmailPage";
import ResetPassword from "../features/auth/pages/ResetPassword";
import OAuthCallback from "../features/auth/pages/OAuthCallback";
import PublicLayout from "../layouts/PublicLayout";

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
                        <DocumentTitle title="Dashboard" />
                        <Dashboard />
                    </ProtectedRoute>
                }
            >
                {/* Account */}
                <Route
                    path="account"
                    element={
                        <>
                            <DocumentTitle title="Account" />
                            <AccountPage />
                        </>
                    }
                />
                <Route
                    path="preferences"
                    element={
                        <>
                            <DocumentTitle title="Preferences" />
                            <PreferencesPage />
                        </>
                    }
                />
                <Route
                    path="settings"
                    element={<Navigate to="/dashboard/preferences" replace />}
                />

                {/* Transcriptions */}
                <Route
                    path="transcriptions/upload"
                    element={
                        <>
                            <DocumentTitle title="Upload" />
                            <UploadAudioPage />
                        </>
                    }
                />
                <Route
                    path="transcriptions/history"
                    element={
                        <>
                            <DocumentTitle title="History" />
                            <TranscriptionHistoryPage />
                        </>
                    }
                >
                    <Route path="app" element={<AppHistoryPage />} />
                    <Route path="assemblyai" element={<AssemblyAIHistoryPage />} />
                    <Route path="offline" element={<Navigate to="../app" replace />} />
                    <Route
                        path="online"
                        element={<Navigate to="../assemblyai" replace />}
                    />
                    <Route index element={<AppHistoryPage />} />
                </Route>
                <Route
                    path="transcriptions/:id"
                    element={
                        <>
                            <DocumentTitle title="Transcription" />
                            <TranscriptionDetailPage />
                        </>
                    }
                />
            </Route>
        </Routes>
    );
};

export default AppRoutes;
