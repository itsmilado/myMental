// src/features/auth/pages/OAuthCallback.tsx

import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
    Alert,
    Button,
    Card,
    CardContent,
    Stack,
    Typography,
} from "@mui/material";
import CheckCircleOutlineRoundedIcon from "@mui/icons-material/CheckCircleOutlineRounded";
import ErrorOutlineRoundedIcon from "@mui/icons-material/ErrorOutlineRounded";
import type { SxProps, Theme } from "@mui/material/styles";

import GlobalLoader from "../../../components/global/GlobalLoader";
import DocumentTitle from "../../../components/global/DocumentTitle";
import { fetchCurrentUser } from "../api";
import { useAuthStore } from "../../../store/useAuthStore";

type OAuthUiState =
    | { status: "loading" }
    | { status: "success" }
    | {
          status: "error";
          title: string;
          message: string;
          showAccountAction?: boolean;
      };

const cardSx: SxProps<Theme> = {
    width: "100%",
    maxWidth: 560,
    borderRadius: 6,
    backgroundColor: (theme) =>
        theme.palette.mode === "dark"
            ? theme.palette.background.paper
            : "#fbfbfd",
    borderColor: (theme) =>
        theme.palette.mode === "dark"
            ? theme.palette.divider
            : "rgba(15, 23, 42, 0.08)",
    boxShadow: (theme) =>
        theme.palette.mode === "dark"
            ? "0 10px 30px rgba(0, 0, 0, 0.28)"
            : "0 8px 30px rgba(15, 23, 42, 0.06)",
};

const OAuthCallback = () => {
    const navigate = useNavigate();
    const [params] = useSearchParams();
    const setUser = useAuthStore((state) => state.setUser);

    const [uiState, setUiState] = useState<OAuthUiState>({ status: "loading" });

    useEffect(() => {
        const run = async () => {
            const err = params.get("error");
            const linkRequired = params.get("link_required") === "1";

            if (linkRequired) {
                if (err === "reauth_required") {
                    setUiState({
                        status: "error",
                        title: "Verification required",
                        message:
                            "For security, you need to re-authenticate before linking Google. Return to Account settings and try again.",
                        showAccountAction: true,
                    });
                    return;
                }

                setUiState({
                    status: "error",
                    title: "Sign-in could not be completed",
                    message:
                        "A local account already exists for this email. Sign in with your password first, then link Google from Account settings.",
                    showAccountAction: true,
                });
                return;
            }

            if (err) {
                setUiState({
                    status: "error",
                    title: "Google sign-in failed",
                    message:
                        "We could not complete your Google sign-in. Please try again or return to the sign-in page.",
                });
                return;
            }

            try {
                const me = await fetchCurrentUser();

                if (!me?.userData) {
                    throw new Error("Missing user");
                }

                setUser(me.userData);
                setUiState({ status: "success" });

                navigate("/dashboard", { replace: true });
            } catch {
                setUiState({
                    status: "error",
                    title: "Could not finish sign-in",
                    message:
                        "Your Google account was verified, but the app could not finish loading your session. Please try again.",
                });
            }
        };

        void run();
    }, [navigate, params, setUser]);

    const title = useMemo(() => {
        if (uiState.status === "error") return "Sign in";
        if (uiState.status === "success") return "Redirecting";
        return "Signing in";
    }, [uiState.status]);

    if (uiState.status === "loading") {
        return (
            <>
                <DocumentTitle title={title} />
                <Card variant="outlined" sx={cardSx}>
                    <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
                        <Stack
                            spacing={3}
                            alignItems="center"
                            textAlign="center"
                        >
                            <Typography variant="h5" fontWeight={800}>
                                Connecting your account…
                            </Typography>

                            <Typography variant="body2" color="text.secondary">
                                We're securely finishing your Google sign-in and
                                preparing your workspace.
                            </Typography>

                            <GlobalLoader
                                label="This only takes a moment."
                                minHeight="160px"
                            />
                        </Stack>
                    </CardContent>
                </Card>
            </>
        );
    }

    if (uiState.status === "success") {
        return (
            <>
                <DocumentTitle title={title} />
                <Card variant="outlined" sx={cardSx}>
                    <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
                        <Stack
                            spacing={2}
                            alignItems="center"
                            textAlign="center"
                        >
                            <CheckCircleOutlineRoundedIcon fontSize="large" />
                            <Typography variant="h5" fontWeight={800}>
                                Sign-in successful
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Redirecting you to your dashboard…
                            </Typography>
                        </Stack>
                    </CardContent>
                </Card>
            </>
        );
    }

    return (
        <>
            <DocumentTitle title={title} />
            <Card variant="outlined" sx={cardSx}>
                <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
                    <Stack spacing={3}>
                        <Stack spacing={1.5} alignItems="flex-start">
                            <ErrorOutlineRoundedIcon fontSize="large" />
                            <div>
                                <Typography
                                    variant="h5"
                                    fontWeight={800}
                                    gutterBottom
                                >
                                    {uiState.title}
                                </Typography>
                                <Typography
                                    variant="body2"
                                    color="text.secondary"
                                >
                                    Review the message below and choose how
                                    you'd like to continue.
                                </Typography>
                            </div>
                        </Stack>

                        <Alert severity="error">{uiState.message}</Alert>

                        <Stack
                            direction={{ xs: "column", sm: "row" }}
                            spacing={1.5}
                        >
                            <Button
                                variant="contained"
                                onClick={() => navigate("/sign-in")}
                            >
                                Back to sign in
                            </Button>

                            <Button
                                variant="outlined"
                                onClick={() => navigate("/")}
                            >
                                Back to home
                            </Button>

                            {uiState.showAccountAction ? (
                                <Button
                                    variant="text"
                                    onClick={() =>
                                        navigate("/dashboard/account")
                                    }
                                >
                                    Go to Account settings
                                </Button>
                            ) : null}
                        </Stack>
                    </Stack>
                </CardContent>
            </Card>
        </>
    );
};

export default OAuthCallback;
