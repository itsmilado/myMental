// src/features/account/pages/AcccountPage.tsx

import { useEffect, useMemo, useState } from "react";
import {
    Box,
    Paper,
    Typography,
    Stack,
    Divider,
    Button,
    Snackbar,
    Alert,
    TextField,
    Chip,
} from "@mui/material";
import { useNavigate } from "react-router-dom";

import { useAuthStore } from "../../../store/useAuthStore";
import ReauthDialog from "../components/ReauthDialog";
import DeleteAccountConfirmDialog from "../components/DeleteAccountConfirmDialog";
import ChangePasswordDialog from "../components/ChangePasswordDialog";
import ChangeEmailDialog from "../components/ChangeEmailDialog";

import {
    deleteMyAccount,
    changeMyPassword,
    updateCurrentUser,
} from "../../auth/api";

const isValidName = (value: string) => {
    const v = value.trim();
    if (v.length < 1 || v.length > 30) return false;
    return /^[A-Za-zÀ-ÖØ-öø-ÿ -]+$/.test(v);
};

const AccountPage = () => {
    const user = useAuthStore((s) => s.user);
    const setUser = useAuthStore((s) => s.setUser);
    const clearUser = useAuthStore((s) => s.clearUser);
    const navigate = useNavigate();

    const [editingProfile, setEditingProfile] = useState(false);
    const [savingProfile, setSavingProfile] = useState(false);
    const [firstName, setFirstName] = useState(user?.first_name ?? "");
    const [lastName, setLastName] = useState(user?.last_name ?? "");

    useEffect(() => {
        setFirstName(user?.first_name ?? "");
        setLastName(user?.last_name ?? "");
    }, [user?.first_name, user?.last_name]);

    const profileValidation = useMemo(() => {
        if (!editingProfile) return { ok: true, reason: "" };
        if (!isValidName(firstName))
            return { ok: false, reason: "Invalid first name" };
        if (!isValidName(lastName))
            return { ok: false, reason: "Invalid last name" };
        return { ok: true, reason: "" };
    }, [editingProfile, firstName, lastName]);

    // delete flow
    const [reauthDeleteOpen, setReauthDeleteOpen] = useState(false);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [deleting, setDeleting] = useState(false);

    // change password flow
    const [reauthPwOpen, setReauthPwOpen] = useState(false);
    const [changePwOpen, setChangePwOpen] = useState(false);
    const [changingPw, setChangingPw] = useState(false);

    // change email flow
    const [reauthEmailOpen, setReauthEmailOpen] = useState(false);
    const [changeEmailOpen, setChangeEmailOpen] = useState(false);

    const [toast, setToast] = useState<{
        open: boolean;
        message: string;
        severity: "success" | "error" | "info";
    }>({ open: false, message: "", severity: "success" });

    const startDeleteFlow = () => setReauthDeleteOpen(true);
    const handleReauthDeleteSuccess = () => {
        setReauthDeleteOpen(false);
        setDeleteConfirmOpen(true);
    };

    const handleDelete = async () => {
        try {
            setDeleting(true);
            await deleteMyAccount();
            clearUser();
            setToast({
                open: true,
                message: "Account deleted",
                severity: "success",
            });
            navigate("/", { replace: true });
        } catch (e: any) {
            setToast({
                open: true,
                message: e?.message || "Failed to delete account",
                severity: "error",
            });
        } finally {
            setDeleting(false);
            setDeleteConfirmOpen(false);
        }
    };

    const startChangePasswordFlow = () => setReauthPwOpen(true);
    const handleReauthPwSuccess = () => {
        setReauthPwOpen(false);
        setChangePwOpen(true);
    };

    const handleChangePassword = async (newPassword: string) => {
        try {
            setChangingPw(true);
            const msg = await changeMyPassword(newPassword);
            setToast({
                open: true,
                message: msg || "Password updated",
                severity: "success",
            });
            setChangePwOpen(false);
        } catch (e: any) {
            setToast({
                open: true,
                message: e?.message || "Failed to update password",
                severity: "error",
            });
        } finally {
            setChangingPw(false);
        }
    };

    const startChangeEmailFlow = () => setReauthEmailOpen(true);
    const handleReauthEmailSuccess = () => {
        setReauthEmailOpen(false);
        setChangeEmailOpen(true);
    };

    const handleSaveProfile = async () => {
        if (!profileValidation.ok) {
            setToast({
                open: true,
                message: profileValidation.reason,
                severity: "error",
            });
            return;
        }

        try {
            setSavingProfile(true);
            const updated = await updateCurrentUser({
                first_name: firstName.trim(),
                last_name: lastName.trim(),
            });
            setUser(updated);
            setEditingProfile(false);
            setToast({
                open: true,
                message: "Profile updated",
                severity: "success",
            });
        } catch (e: any) {
            setToast({
                open: true,
                message: e?.message || "Failed to update profile",
                severity: "error",
            });
        } finally {
            setSavingProfile(false);
        }
    };

    const handleCancelProfileEdit = () => {
        setFirstName(user?.first_name ?? "");
        setLastName(user?.last_name ?? "");
        setEditingProfile(false);
    };

    return (
        <Box>
            <Typography variant="h4" fontWeight="bold" gutterBottom>
                Account
            </Typography>

            <Paper sx={{ p: 3, mb: 2 }}>
                <Stack spacing={2}>
                    <Box>
                        <Typography variant="subtitle2" color="text.secondary">
                            Name
                        </Typography>

                        {!editingProfile ? (
                            <Typography>
                                {user?.first_name} {user?.last_name}
                            </Typography>
                        ) : (
                            <Stack
                                direction={{ xs: "column", sm: "row" }}
                                spacing={2}
                            >
                                <TextField
                                    label="First name"
                                    value={firstName}
                                    onChange={(e) =>
                                        setFirstName(e.target.value)
                                    }
                                    disabled={savingProfile}
                                    fullWidth
                                />
                                <TextField
                                    label="Last name"
                                    value={lastName}
                                    onChange={(e) =>
                                        setLastName(e.target.value)
                                    }
                                    disabled={savingProfile}
                                    fullWidth
                                />
                            </Stack>
                        )}
                    </Box>

                    <Box>
                        <Typography variant="subtitle2" color="text.secondary">
                            Email
                        </Typography>

                        <Stack
                            direction="row"
                            spacing={1}
                            alignItems="center"
                            flexWrap="wrap"
                        >
                            <Typography>{user?.email}</Typography>
                            <Chip
                                size="small"
                                label={
                                    user?.isconfirmed
                                        ? "Confirmed"
                                        : "Unconfirmed"
                                }
                                variant="outlined"
                            />
                        </Stack>
                    </Box>

                    <Divider />

                    <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                        {!editingProfile ? (
                            <Button
                                variant="outlined"
                                onClick={() => setEditingProfile(true)}
                            >
                                Edit profile
                            </Button>
                        ) : (
                            <>
                                <Button
                                    variant="contained"
                                    onClick={handleSaveProfile}
                                    disabled={
                                        savingProfile || !profileValidation.ok
                                    }
                                >
                                    Save
                                </Button>
                                <Button
                                    variant="outlined"
                                    onClick={handleCancelProfileEdit}
                                    disabled={savingProfile}
                                >
                                    Cancel
                                </Button>
                            </>
                        )}

                        <Button
                            variant="outlined"
                            onClick={startChangeEmailFlow}
                        >
                            Change email
                        </Button>

                        <Button
                            variant="outlined"
                            onClick={startChangePasswordFlow}
                        >
                            Change password
                        </Button>

                        <Button
                            variant="contained"
                            color="error"
                            onClick={startDeleteFlow}
                            disabled={deleting}
                        >
                            Delete account
                        </Button>
                    </Stack>
                </Stack>
            </Paper>

            <ReauthDialog
                open={reauthEmailOpen}
                onClose={() => setReauthEmailOpen(false)}
                onSuccess={handleReauthEmailSuccess}
            />

            <ChangeEmailDialog
                open={changeEmailOpen}
                onClose={() => setChangeEmailOpen(false)}
                onInfo={(msg) =>
                    setToast({ open: true, message: msg, severity: "info" })
                }
            />

            <ReauthDialog
                open={reauthPwOpen}
                onClose={() => setReauthPwOpen(false)}
                onSuccess={handleReauthPwSuccess}
            />

            <ChangePasswordDialog
                open={changePwOpen}
                onClose={() => setChangePwOpen(false)}
                onSubmit={handleChangePassword}
                loading={changingPw}
            />

            <ReauthDialog
                open={reauthDeleteOpen}
                onClose={() => setReauthDeleteOpen(false)}
                onSuccess={handleReauthDeleteSuccess}
            />

            <DeleteAccountConfirmDialog
                open={deleteConfirmOpen}
                onClose={() => setDeleteConfirmOpen(false)}
                onConfirm={handleDelete}
                loading={deleting}
            />

            <Snackbar
                open={toast.open}
                autoHideDuration={3500}
                onClose={() => setToast((t) => ({ ...t, open: false }))}
                anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
            >
                <Alert
                    onClose={() => setToast((t) => ({ ...t, open: false }))}
                    severity={toast.severity}
                    sx={{ width: "100%" }}
                >
                    {toast.message}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default AccountPage;
