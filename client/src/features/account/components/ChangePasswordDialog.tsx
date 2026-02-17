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
import { useState } from "react";

const ChangePasswordDialog = ({
    open,
    onClose,
    onSubmit,
    loading,
}: {
    open: boolean;
    onClose: () => void;
    onSubmit: (newPassword: string) => Promise<void>;
    loading: boolean;
}) => {
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState<string | null>(null);

    const reset = () => {
        setNewPassword("");
        setConfirmPassword("");
        setError(null);
    };

    const handleClose = () => {
        reset();
        onClose();
    };

    const handleSave = async () => {
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
        reset();
    };

    return (
        <Dialog open={open} onClose={handleClose} fullWidth maxWidth="xs">
            <DialogTitle>Change password</DialogTitle>

            <DialogContent>
                <Stack spacing={2} sx={{ mt: 1 }}>
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
