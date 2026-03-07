// src/features/account/components/ReauthDialog.tsx

import { useEffect, useState } from "react";
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Alert,
    Stack,
    IconButton,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { reauthCurrentUser, startGoogleOAuth } from "../../auth/api";

type GoogleIntent = "link" | "reauth_email" | "reauth_delete" | "reauth_unlink";

type Props = {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
    mode?: "password" | "google";
    title?: string;
    description?: string;
    googleIntent?: GoogleIntent;
};

const ReauthDialog = ({
    open,
    onClose,
    onSuccess,
    mode = "password",
    title = "Re-authenticate",
    description,
    googleIntent = "reauth_email",
}: Props) => {
    const [password, setPassword] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!open) return;
        setPassword("");
        setSubmitting(false);
        setError(null);
    }, [open]);

    const handlePasswordConfirm = async () => {
        if (!password.trim()) {
            setError("Password is required.");
            return;
        }

        try {
            setSubmitting(true);
            setError(null);
            await reauthCurrentUser(password);
            onSuccess();
        } catch (e: any) {
            setError(e?.message || "Re-authentication failed.");
        } finally {
            setSubmitting(false);
        }
    };

    const handleGoogleConfirm = () => {
        setError(null);
        startGoogleOAuth(googleIntent);
    };

    return (
        <Dialog
            open={open}
            onClose={submitting ? undefined : onClose}
            fullWidth
            maxWidth="xs"
        >
            <DialogTitle sx={{ pr: 6 }}>
                {title}
                <IconButton
                    onClick={onClose}
                    aria-label="close"
                    sx={{ position: "absolute", right: 8, top: 8 }}
                    disabled={submitting}
                >
                    <CloseIcon />
                </IconButton>
            </DialogTitle>

            <DialogContent dividers>
                <Stack spacing={2}>
                    <Alert severity="info">
                        {description ||
                            (mode === "google"
                                ? "Please continue with Google to verify your identity before this action."
                                : "Please confirm your password to continue.")}
                    </Alert>

                    {mode === "password" ? (
                        <TextField
                            label="Current password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            disabled={submitting}
                            fullWidth
                            autoFocus
                        />
                    ) : null}

                    {error ? <Alert severity="error">{error}</Alert> : null}
                </Stack>
            </DialogContent>

            <DialogActions>
                <Button onClick={onClose} disabled={submitting}>
                    Cancel
                </Button>

                {mode === "google" ? (
                    <Button variant="contained" onClick={handleGoogleConfirm}>
                        Continue with Google
                    </Button>
                ) : (
                    <Button
                        variant="contained"
                        onClick={handlePasswordConfirm}
                        disabled={submitting}
                    >
                        Confirm
                    </Button>
                )}
            </DialogActions>
        </Dialog>
    );
};

export default ReauthDialog;
