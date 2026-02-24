// src/features/auth/pages/ResetPassword.tsx

import * as React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
    Box,
    Button,
    Card,
    CircularProgress,
    Alert,
    TextField,
    Typography,
    Stack,
} from "@mui/material";
import { resetPassword } from "../api";

const ResetPassword: React.FC = () => {
    const navigate = useNavigate();
    const [params] = useSearchParams();

    const token = params.get("token") || "";

    const [password, setPassword] = React.useState("");
    const [confirm, setConfirm] = React.useState("");

    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const [success, setSuccess] = React.useState<string | null>(null);

    const validate = () => {
        if (!token) return "Missing reset token.";
        if (!password || password.length < 8)
            return "Password must be at least 8 characters.";
        if (confirm !== password) return "Passwords do not match.";
        return null;
    };

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        const v = validate();
        if (v) {
            setError(v);
            return;
        }

        setLoading(true);
        try {
            const res = await resetPassword(token, password);
            if (!res?.success) {
                setError(res?.message || "Password reset failed.");
                setLoading(false);
                return;
            }
            setSuccess(res.message || "Password updated. You can now sign in.");
            setLoading(false);

            // Redirect to sign-in shortly after success
            setTimeout(() => navigate("/sign-in", { replace: true }), 800);
        } catch (err: any) {
            setError(err?.response?.data?.message || "Password reset failed.");
            setLoading(false);
        }
    };

    return (
        <Box
            sx={{
                minHeight: "100dvh",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                p: 2,
            }}
        >
            <Card
                sx={{
                    width: "100%",
                    maxWidth: 520,
                    p: { xs: 2, sm: 4 },
                    borderRadius: 3,
                }}
            >
                <Stack spacing={2}>
                    <Box>
                        <Typography
                            variant="h4"
                            sx={{ fontSize: "clamp(1.6rem, 5vw, 2rem)" }}
                        >
                            Reset password
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Choose a new password for your account.
                        </Typography>
                    </Box>

                    {error && <Alert severity="error">{error}</Alert>}
                    {success && <Alert severity="success">{success}</Alert>}

                    <Box
                        component="form"
                        onSubmit={onSubmit}
                        sx={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 2,
                        }}
                    >
                        <TextField
                            label="New password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            autoComplete="new-password"
                            required
                            fullWidth
                            disabled={loading || Boolean(success)}
                        />
                        <TextField
                            label="Confirm new password"
                            type="password"
                            value={confirm}
                            onChange={(e) => setConfirm(e.target.value)}
                            autoComplete="new-password"
                            required
                            fullWidth
                            disabled={loading || Boolean(success)}
                        />

                        <Button
                            type="submit"
                            variant="contained"
                            disabled={loading || Boolean(success)}
                        >
                            {loading ? (
                                <CircularProgress size={22} />
                            ) : (
                                "Update password"
                            )}
                        </Button>

                        <Button
                            type="button"
                            variant="text"
                            onClick={() => navigate("/", { replace: true })}
                            disabled={loading}
                        >
                            Back to sign in
                        </Button>
                    </Box>
                </Stack>
            </Card>
        </Box>
    );
};

export default ResetPassword;
