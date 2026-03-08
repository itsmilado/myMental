// src/features/account/components/ChangePasswordDialog.tsx

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
import { useEffect, useState } from "react";

type ChangePasswordPayload = {
    currentPassword?: string;
    newPassword: string;
};

const ChangePasswordDialog = ({
    open,
    onClose,
    onSubmit,
    loading,
    requireCurrentPassword = false,
}: {
    open: boolean;
    onClose: () => void;
    onSubmit: (payload: ChangePasswordPayload) => Promise<void>;
    loading: boolean;
    requireCurrentPassword?: boolean;
}) => {
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState<string | null>(null);

    const reset = () => {
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setError(null);
    };

    useEffect(() => {
        if (!open) {
            reset();
        }
    }, [open]);

    const handleClose = () => {
        if (loading) return;
        reset();
        onClose();
    };

    const handleSave = async () => {
        setError(null);

        const cp = currentPassword.trim();
        const np = newPassword.trim();

        if (requireCurrentPassword && !cp) {
            setError("Current password is required.");
            return;
        }

        if (np.length < 6) {
            setError("Password must be at least 6 characters.");
            return;
        }

        if (np !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        await onSubmit({
            currentPassword: cp || undefined,
            newPassword: np,
        });

        reset();
    };

    return (
        <Dialog open={open} onClose={handleClose} fullWidth maxWidth="xs">
            <DialogTitle>Change password</DialogTitle>

            <DialogContent>
                <Stack spacing={2} sx={{ mt: 1 }}>
                    {error ? <Alert severity="error">{error}</Alert> : null}

                    {requireCurrentPassword ? (
                        <TextField
                            label="Current password"
                            type="password"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            autoComplete="current-password"
                            disabled={loading}
                            fullWidth
                            autoFocus
                        />
                    ) : null}

                    <TextField
                        label="New password"
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        autoComplete="new-password"
                        disabled={loading}
                        fullWidth
                        autoFocus={!requireCurrentPassword}
                    />

                    <TextField
                        label="Confirm new password"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        autoComplete="new-password"
                        disabled={loading}
                        fullWidth
                    />
                </Stack>
            </DialogContent>

            <DialogActions>
                <Button onClick={handleClose} disabled={loading}>
                    Cancel
                </Button>
                <Button
                    onClick={handleSave}
                    variant="contained"
                    disabled={loading}
                >
                    Save
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default ChangePasswordDialog;
