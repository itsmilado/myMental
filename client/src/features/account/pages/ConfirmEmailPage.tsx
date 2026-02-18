import { useEffect, useMemo, useState } from "react";
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

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string>("");
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        const run = async () => {
            if (!token) {
                setError("Missing token");
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                setError("");
                const updated = await confirmEmail(token);
                setUser(updated);
                setSuccess(true);
            } catch (e: any) {
                setError(e?.message || "Email confirmation failed");
            } finally {
                setLoading(false);
            }
        };

        run();
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

                    {!loading && error ? (
                        <Alert severity="error">{error}</Alert>
                    ) : null}
                    {!loading && success ? (
                        <Alert severity="success">
                            Your email has been confirmed.
                        </Alert>
                    ) : null}

                    <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                        <Button
                            variant="contained"
                            onClick={() =>
                                navigate("/account", { replace: true })
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
