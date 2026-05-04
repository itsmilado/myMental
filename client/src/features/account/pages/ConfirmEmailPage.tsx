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
import { styled } from "@mui/material/styles";
import { confirmEmail } from "../../../api/authApi";
import { useAuthStore } from "../../../store/useAuthStore";
import DocumentTitle from "../../../components/global/DocumentTitle";
import { appSectionCardSx } from "../../../styles/surfaces";

const PageRoot = styled(Box)(({ theme }) => ({
    minHeight: "100dvh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f4f6fb",
    backgroundImage:
        "radial-gradient(ellipse at 35% 10%, rgba(99, 102, 241, 0.05), transparent 55%), radial-gradient(ellipse at 80% 0%, rgba(2, 132, 199, 0.04), transparent 45%)",
    backgroundRepeat: "no-repeat",
    color: theme.palette.text.primary,
    padding: theme.spacing(6, 2),
    ...theme.applyStyles("dark", {
        backgroundColor: "#0b1120",
        backgroundImage:
            "radial-gradient(ellipse at 35% 10%, rgba(99, 102, 241, 0.16), transparent 55%), radial-gradient(ellipse at 80% 0%, rgba(2, 132, 199, 0.10), transparent 45%)",
    }),
}));

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
        <PageRoot>
            <DocumentTitle title="Confirm email" />
            <Paper
                elevation={0}
                sx={(theme) => ({
                    ...appSectionCardSx(theme),
                    width: "100%",
                    maxWidth: 460,
                    p: { xs: 2.5, sm: 3 },
                })}
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
                        <Alert severity="success" variant="outlined">
                            Your email has been confirmed successfully.
                        </Alert>
                    ) : null}

                    {!loading && !success && error ? (
                        <Alert severity="error" variant="outlined">
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
        </PageRoot>
    );
};

export default ConfirmEmailPage;
