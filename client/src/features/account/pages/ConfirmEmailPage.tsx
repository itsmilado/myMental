// src/features/account/pages/ConffirmEmailChange.tsx

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
                setError("Missing token");
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
                setError("");
            } catch (e: any) {
                // If success already happened (e.g., duplicate run), ignore the error
                setSuccess((prev) => {
                    if (prev) return prev;
                    return false;
                });

                setError((prev) => {
                    // If already confirmed successfully, keep UI success-only
                    if (success) return "";
                    return e?.message || "Email confirmation failed";
                });
            } finally {
                setLoading(false);
            }
        };

        run();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token, setUser]);

    return (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 6, px: 2 }}>
            <Paper sx={{ p: 3, maxWidth: 520, width: "100%" }}>
                <Stack spacing={2}>
                    <Typography variant="h5" fontWeight="bold">
                        Confirm email
                    </Typography>

                    {loading ? (
                        <Stack direction="row" spacing={2} alignItems="center">
                            <CircularProgress size={22} />
                            <Typography color="text.secondary">
                                Verifying…
                            </Typography>
                        </Stack>
                    ) : null}

                    {!loading && success ? (
                        <Alert severity="success">
                            Your email has been confirmed.
                        </Alert>
                    ) : null}

                    {!loading && !success && error ? (
                        <Alert severity="error">{error}</Alert>
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
