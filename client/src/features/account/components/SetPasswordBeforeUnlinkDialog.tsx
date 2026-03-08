// src/features/account/components/SetPasswordBeforeUnlinkDialog.tsx

import {
    Alert,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Stack,
    TextField,
} from "@mui/material";
import { useEffect, useState } from "react";

type Props = {
    open: boolean;
    loading: boolean;
    onClose: () => void;
    onSubmit: (newPassword: string) => Promise<void>;
};

const SetPasswordBeforeUnlinkDialog = ({
    open,
    loading,
    onClose,
    onSubmit,
}: Props) => {
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!open) {
            setNewPassword("");
            setConfirmPassword("");
            setError(null);
        }
    }, [open]);

    const handleSubmit = async () => {
        setError(null);

        const np = newPassword.trim();

        if (np.length < 6) {
            setError("Password must be at least 6 characters.");
            return;
        }

        if (np !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        await onSubmit(np);
    };

    return (
        <Dialog
            open={open}
            onClose={loading ? undefined : onClose}
            fullWidth
            maxWidth="xs"
        >
            <DialogTitle>Set password before removing Google</DialogTitle>

            <DialogContent dividers>
                <Stack spacing={2}>
                    <Alert severity="info">
                        To remove Google sign-in, first create a password for
                        this account.
                    </Alert>

                    {error ? <Alert severity="error">{error}</Alert> : null}

                    <TextField
                        label="New password"
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        autoComplete="new-password"
                        disabled={loading}
                        fullWidth
                        autoFocus
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
                <Button onClick={onClose} disabled={loading}>
                    Cancel
                </Button>
                <Button
                    onClick={handleSubmit}
                    variant="contained"
                    disabled={loading}
                >
                    Save password and remove Google
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default SetPasswordBeforeUnlinkDialog;
