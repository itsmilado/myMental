// src/features/profile/components/ProfileDialog.tsx

import { useEffect, useMemo, useState } from "react";
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography,
    IconButton,
    Box,
    TextField,
    Snackbar,
    Alert,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { useAuthStore } from "../../../store/useAuthStore";
import { ProfileDialogProps } from "../../../types/types";
import { updateCurrentUser } from "../../auth/api";

const isValidEmail = (value: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
const isValidName = (value: string) => {
    const v = value.trim();
    if (v.length < 1 || v.length > 30) return false;
    return /^[A-Za-zÀ-ÖØ-öø-ÿ -]+$/.test(v);
};

const ProfileDialog = ({ open, onClose }: ProfileDialogProps) => {
    const user = useAuthStore((state) => state.user);
    const setUser = useAuthStore((state) => state.setUser);

    const [isEditing, setIsEditing] = useState(false);
    const [saving, setSaving] = useState(false);

    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [email, setEmail] = useState("");

    const [snackbar, setSnackbar] = useState<{
        open: boolean;
        message: string;
        severity: "success" | "error";
    }>({ open: false, message: "", severity: "success" });

    useEffect(() => {
        if (!open) return;
        // reset state on open
        setIsEditing(false);
        setSaving(false);

        setFirstName(user?.first_name ?? "");
        setLastName(user?.last_name ?? "");
        setEmail(user?.email ?? "");
    }, [open, user]);

    const validation = useMemo(() => {
        if (!isEditing) return { ok: true, reason: "" };
        if (!isValidName(firstName))
            return { ok: false, reason: "First name is invalid" };
        if (!isValidName(lastName))
            return { ok: false, reason: "Last name is invalid" };
        if (!isValidEmail(email))
            return { ok: false, reason: "Email is invalid" };
        return { ok: true, reason: "" };
    }, [isEditing, firstName, lastName, email]);

    const handleClose = () => {
        setIsEditing(false);
        onClose();
    };

    const handleSave = async () => {
        if (!user) return;
        if (!validation.ok) {
            setSnackbar({
                open: true,
                message: validation.reason,
                severity: "error",
            });
            return;
        }

        const payload: {
            first_name?: string;
            last_name?: string;
            email?: string;
        } = {};

        if (firstName.trim() !== (user.first_name ?? "").trim())
            payload.first_name = firstName.trim();
        if (lastName.trim() !== (user.last_name ?? "").trim())
            payload.last_name = lastName.trim();
        if (email.trim() !== (user.email ?? "").trim())
            payload.email = email.trim();

        if (Object.keys(payload).length === 0) {
            setSnackbar({
                open: true,
                message: "No changes to save",
                severity: "success",
            });
            setIsEditing(false);
            return;
        }

        try {
            setSaving(true);
            const updated = await updateCurrentUser(payload);

            setUser(updated);
            setSnackbar({
                open: true,
                message: "Profile updated",
                severity: "success",
            });
            setIsEditing(false);
        } catch (err: any) {
            setSnackbar({
                open: true,
                message: err?.message || "Update failed",
                severity: "error",
            });
        } finally {
            setSaving(false);
        }
    };

    return (
        <>
            <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ m: 0, p: 2 }}>
                    Profile
                    <IconButton
                        aria-label="Close"
                        onClick={handleClose}
                        sx={{ position: "absolute", right: 8, top: 8 }}
                    >
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>

                <DialogContent dividers>
                    {!user ? (
                        <Typography>Loading user data.</Typography>
                    ) : (
                        <Box
                            sx={{
                                display: "flex",
                                flexDirection: "column",
                                gap: 2,
                            }}
                        >
                            {!isEditing ? (
                                <>
                                    <Typography>
                                        <strong>Name:</strong> {user.first_name}{" "}
                                        {user.last_name}
                                    </Typography>
                                    <Typography>
                                        <strong>Email:</strong> {user.email}
                                    </Typography>
                                    <Typography>
                                        <strong>Joined since:</strong>{" "}
                                        {new Date(
                                            user.created_at,
                                        ).toLocaleDateString()}
                                    </Typography>
                                </>
                            ) : (
                                <>
                                    <TextField
                                        label="First name"
                                        value={firstName}
                                        onChange={(e) =>
                                            setFirstName(e.target.value)
                                        }
                                        disabled={saving}
                                        error={
                                            firstName.length > 0 &&
                                            !isValidName(firstName)
                                        }
                                        helperText="Letters, spaces, hyphen. Max 30."
                                        fullWidth
                                    />
                                    <TextField
                                        label="Last name"
                                        value={lastName}
                                        onChange={(e) =>
                                            setLastName(e.target.value)
                                        }
                                        disabled={saving}
                                        error={
                                            lastName.length > 0 &&
                                            !isValidName(lastName)
                                        }
                                        helperText="Letters, spaces, hyphen. Max 30."
                                        fullWidth
                                    />
                                    <TextField
                                        label="Email"
                                        value={email}
                                        onChange={(e) =>
                                            setEmail(e.target.value)
                                        }
                                        disabled={saving}
                                        error={
                                            email.length > 0 &&
                                            !isValidEmail(email)
                                        }
                                        helperText="Must be a valid email address."
                                        fullWidth
                                    />
                                </>
                            )}
                        </Box>
                    )}
                </DialogContent>

                <DialogActions>
                    {!isEditing ? (
                        <Button
                            onClick={() => setIsEditing(true)}
                            disabled={!user}
                        >
                            Edit
                        </Button>
                    ) : (
                        <Button
                            onClick={() => {
                                setIsEditing(false);
                                setFirstName(user?.first_name ?? "");
                                setLastName(user?.last_name ?? "");
                                setEmail(user?.email ?? "");
                            }}
                            disabled={saving}
                        >
                            Cancel
                        </Button>
                    )}

                    <Button
                        variant="contained"
                        onClick={handleSave}
                        disabled={
                            !user || !isEditing || saving || !validation.ok
                        }
                    >
                        Save
                    </Button>
                </DialogActions>
            </Dialog>

            <Snackbar
                open={snackbar.open}
                autoHideDuration={2500}
                onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            >
                <Alert
                    severity={snackbar.severity}
                    onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </>
    );
};

export default ProfileDialog;
