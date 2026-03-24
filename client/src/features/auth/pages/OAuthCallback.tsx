// src/features/auth/pages/OAuthCallback.tsx

import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import GlobalLoader from "../../../components/global/GlobalLoader";
import DocumentTitle from "../../../components/global/DocumentTitle";

import { Alert, Button, Stack, Typography, Card } from "@mui/material";
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
            const linkRequired = params.get("link_required") === "1";

            if (linkRequired) {
                if (err === "reauth_required") {
                    setError(
                        "Re-authentication is required to link Google. Go to Account and try again.",
                    );
                } else {
                    setError(
                        "A local account already exists for this email. For security, Google was not linked automatically. Please sign in with email/password and link Google from Account settings.",
                    );
                }
                return;
            }

            if (err) {
                setError("Google sign-in failed. Please try again.");
                return;
            }

            try {
                const me = await fetchCurrentUser();
                if (!me?.userData) throw new Error("Missing user");
                setUser(me.userData);
                navigate("/dashboard", {
                    replace: true,
                });
            } catch {
                setError("Could not finish sign-in. Please try again.");
            }
        };

        run();
    }, [navigate, params, setUser]);

    if (!error) {
        return (
            <>
                <DocumentTitle title="Signing in" />
                <GlobalLoader
                    label="We're finishing your secure Google sign-in."
                    minHeight="240px"
                />
            </>
        );
    }

    return (
        <>
            <DocumentTitle title="Sign in" />
            <Card
                variant="outlined"
                sx={{
                    width: "100%",
                    maxWidth: 520,
                    borderRadius: 24,
                    p: 4,
                }}
            >
                <Stack spacing={2}>
                    <div>
                        <Typography variant="h5" fontWeight={800} gutterBottom>
                            Signing you in…
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            We're finishing your secure Google sign-in.
                        </Typography>
                    </div>

                    <Alert severity="error">{error}</Alert>
                    <Button
                        variant="contained"
                        onClick={() => navigate("/sign-in")}
                    >
                        Back to sign in
                    </Button>
                </Stack>
            </Card>
        </>
    );
};

export default OAuthCallback;
