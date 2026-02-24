// src/features/auth/pages/ForgotPassword.tsx

import * as React from "react";
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Alert,
    Stack,
} from "@mui/material";
import { requestPasswordReset } from "../api";

type Props = {
    open: boolean;
    handleClose: () => void;
};

const ForgotPassword: React.FC<Props> = ({ open, handleClose }) => {
    const [email, setEmail] = React.useState("");
    const [submitting, setSubmitting] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const [successMessage, setSuccessMessage] = React.useState<string | null>(
        null,
    );

    React.useEffect(() => {
        if (!open) return;
        setEmail("");
        setSubmitting(false);
        setError(null);
        setSuccessMessage(null);
    }, [open]);

    const handleSubmit = async () => {
        const trimmed = email.trim();
        if (!trimmed) {
            setError("Email is required.");
            return;
        }

        try {
            setSubmitting(true);
            setError(null);

            const res = await requestPasswordReset(trimmed);

            // Backend returns generic success message
            setSuccessMessage(
                res?.message || "If an account exists, a reset link was sent.",
            );
        } catch (e: any) {
            setError(
                e?.response?.data?.message ||
                    "Failed to request password reset.",
            );
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onClose={handleClose} fullWidth maxWidth="xs">
            <DialogTitle>Reset password</DialogTitle>
            <DialogContent dividers>
                <Stack spacing={2}>
                    <Alert severity="info">
                        Enter your email and we’ll send a password reset link if
                        an account exists.
                    </Alert>

                    <TextField
                        label="Email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={submitting}
                        fullWidth
                        autoFocus
                    />

                    {successMessage && (
                        <Alert severity="success">{successMessage}</Alert>
                    )}
                    {error && <Alert severity="error">{error}</Alert>}
                </Stack>
            </DialogContent>

            <DialogActions>
                <Button onClick={handleClose} disabled={submitting}>
                    Close
                </Button>
                <Button
                    variant="contained"
                    onClick={handleSubmit}
                    disabled={submitting || Boolean(successMessage)}
                >
                    Send link
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default ForgotPassword;
