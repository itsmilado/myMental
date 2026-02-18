import { useEffect, useMemo, useState } from "react";
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Typography,
    Stack,
    Alert,
} from "@mui/material";
import { requestEmailChange } from "../../auth/api";

const isValidEmail = (value: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

type Props = {
    open: boolean;
    onClose: () => void;
    onInfo?: (message: string) => void;
};

const ChangeEmailDialog = ({ open, onClose, onInfo }: Props) => {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [done, setDone] = useState(false);
    const [error, setError] = useState<string>("");

    useEffect(() => {
        if (!open) return;
        setEmail("");
        setLoading(false);
        setDone(false);
        setError("");
    }, [open]);

    const validation = useMemo(() => {
        if (!email.trim()) return { ok: false, reason: "Email is required" };
        if (!isValidEmail(email))
            return { ok: false, reason: "Email is invalid" };
        return { ok: true, reason: "" };
    }, [email]);

    const handleSubmit = async () => {
        if (!validation.ok) {
            setError(validation.reason);
            return;
        }

        try {
            setLoading(true);
            setError("");
            const msg = await requestEmailChange(email.trim().toLowerCase());
            setDone(true);
            onInfo?.(msg || "Confirmation email sent");
        } catch (e: any) {
            setError(e?.message || "Failed to request email change");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog
            open={open}
            onClose={loading ? undefined : onClose}
            fullWidth
            maxWidth="sm"
        >
            <DialogTitle>Change email</DialogTitle>

            <DialogContent>
                <Stack spacing={2} sx={{ mt: 1 }}>
                    {!done ? (
                        <>
                            <Typography variant="body2" color="text.secondary">
                                Enter your new email. We’ll send a confirmation
                                link to that address.
                            </Typography>

                            <TextField
                                label="New email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                disabled={loading}
                                autoFocus
                                fullWidth
                            />

                            {error ? (
                                <Alert severity="error">{error}</Alert>
                            ) : null}
                        </>
                    ) : (
                        <Alert severity="success">
                            Confirmation email sent. Please check your inbox and
                            click the link to finish.
                        </Alert>
                    )}
                </Stack>
            </DialogContent>

            <DialogActions>
                <Button onClick={onClose} disabled={loading}>
                    {done ? "Close" : "Cancel"}
                </Button>
                {!done ? (
                    <Button
                        onClick={handleSubmit}
                        variant="contained"
                        disabled={loading || !validation.ok}
                    >
                        Send confirmation
                    </Button>
                ) : null}
            </DialogActions>
        </Dialog>
    );
};

export default ChangeEmailDialog;
