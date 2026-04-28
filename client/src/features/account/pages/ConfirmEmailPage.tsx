// src/features/account/pages/ConfirmEmailPage.tsx

import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
    Box,
    Paper,
    Typography,
    CircularProgress,
    Button,
    Alert,
    Stack,
} from "@mui/material";
import { confirmEmail } from "../../auth/api";
import { useAuthStore } from "../../../store/useAuthStore";

const ConfirmEmailPage = () => {
    const [params] = useSearchParams();
    const navigate = useNavigate();
    const setUser = useAuthStore((s) => s.setUser);

    const token = useMemo(
        () => String(params.get("token") || "").trim(),
        [params],
    );

    const ranRef = useRef(false);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string>("");
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        if (ranRef.current) return;
        ranRef.current = true;

        const run = async () => {
            if (!token) {
                setSuccess(false);
                setError("Missing confirmation token.");
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                setError("");
                setSuccess(false);

                const updated = await confirmEmail(token);
                setUser(updated);

                setSuccess(true);
            } catch (e: any) {
                setError(e?.message || "Email confirmation failed.");
                setSuccess(false);
            } finally {
                setLoading(false);
            }
        };

        run();
    }, [token, setUser]);

    return (
        <Box
            sx={{
                minHeight: "100vh",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "background.default",
                color: "text.primary",
                px: 2,
                py: 6,
            }}
        >
            <Paper
                elevation={0}
                sx={{
                    width: "100%",
                    maxWidth: 460,
                    p: { xs: 2.5, sm: 3 },
                    borderRadius: 4,
                    backgroundColor: "background.paper",
                    border: "1px solid",
                    borderColor: "divider",
                }}
            >
                <Stack spacing={2}>
                    <Typography variant="h5" fontWeight="bold">
                        Confirm email
                    </Typography>

                    <Typography variant="body2" color="text.secondary">
                        This confirmation secures account recovery and completes
                        any pending email verification or email-change request.
                    </Typography>

                    {loading ? (
                        <Stack
                            spacing={2}
                            alignItems="center"
                            sx={{
                                py: 2,
                                color: "text.secondary",
                            }}
                        >
                            <CircularProgress size={28} />
                            <Typography variant="body2" textAlign="center">
                                Verifying your email…
                            </Typography>
                        </Stack>
                    ) : null}

                    {!loading && success ? (
                        <Alert
                            severity="success"
                            variant="outlined"
                            sx={{
                                backgroundColor: "transparent",
                                borderColor: "success.main",
                                color: "text.primary",
                                "& .MuiAlert-icon": {
                                    color: "success.main",
                                },
                            }}
                        >
                            Your email has been confirmed successfully.
                        </Alert>
                    ) : null}

                    {!loading && !success && error ? (
                        <Alert
                            severity="error"
                            variant="outlined"
                            sx={{
                                backgroundColor: "transparent",
                                borderColor: "error.main",
                                color: "text.primary",
                                "& .MuiAlert-icon": {
                                    color: "error.main",
                                },
                            }}
                        >
                            {error}
                        </Alert>
                    ) : null}

                    <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                        <Button
                            variant="contained"
                            onClick={() =>
                                navigate("/dashboard/account", {
                                    replace: true,
                                })
                            }
                        >
                            Go to account
                        </Button>
                        <Button
                            variant="outlined"
                            onClick={() => navigate("/", { replace: true })}
                        >
                            Home
                        </Button>
                    </Stack>
                </Stack>
            </Paper>
        </Box>
    );
};

export default ConfirmEmailPage;
