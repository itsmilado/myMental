// src/features/auth/pages/OAuthCallback.tsx

import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
    Box,
    CircularProgress,
    Typography,
    Alert,
    Button,
} from "@mui/material";
import { fetchCurrentUser } from "../api";
import { useAuthStore } from "../../../store/useAuthStore";

const OAuthCallback = () => {
    const navigate = useNavigate();
    const [params] = useSearchParams();
    const setUser = useAuthStore((s) => s.setUser);

    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const run = async () => {
            const err = params.get("error");
            if (err) {
                setError("Google sign-in failed. Please try again.");
                return;
            }

            try {
                const me = await fetchCurrentUser();
                if (!me?.userData) throw new Error("Missing user");
                setUser(me.userData);
                navigate("/dashboard/transcriptions/history", {
                    replace: true,
                });
            } catch {
                setError("Could not finish sign-in. Please try again.");
            }
        };

        run();
    }, [navigate, params, setUser]);

    return (
        <Box sx={{ p: 4, maxWidth: 520, mx: "auto" }}>
            <Typography variant="h5" fontWeight={800} gutterBottom>
                Signing you in…
            </Typography>

            {!error ? (
                <CircularProgress />
            ) : (
                <>
                    <Alert severity="error" sx={{ mt: 2 }}>
                        {error}
                    </Alert>
                    <Button
                        sx={{ mt: 2 }}
                        variant="contained"
                        onClick={() => navigate("/sign-in")}
                    >
                        Back to sign in
                    </Button>
                </>
            )}
        </Box>
    );
};

export default OAuthCallback;
