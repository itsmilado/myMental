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
import { reauthCurrentUser } from "../../auth/api";

type Props = {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
};

const ReauthDialog = ({ open, onClose, onSuccess }: Props) => {
    const [password, setPassword] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!open) return;
        setPassword("");
        setSubmitting(false);
        setError(null);
    }, [open]);

    const handleConfirm = async () => {
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

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
            <DialogTitle sx={{ pr: 6 }}>
                Re-authenticate
                <IconButton
                    onClick={onClose}
                    aria-label="close"
                    sx={{ position: "absolute", right: 8, top: 8 }}
                >
                    <CloseIcon />
                </IconButton>
            </DialogTitle>

            <DialogContent dividers>
                <Stack spacing={2}>
                    <Alert severity="info">
                        Please confirm your password to continue.
                    </Alert>

                    <TextField
                        label="Current password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={submitting}
                        fullWidth
                        autoFocus
                    />

                    {error && <Alert severity="error">{error}</Alert>}
                </Stack>
            </DialogContent>

            <DialogActions>
                <Button onClick={onClose} disabled={submitting}>
                    Cancel
                </Button>
                <Button
                    variant="contained"
                    onClick={handleConfirm}
                    disabled={submitting}
                >
                    Confirm
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default ReauthDialog;
