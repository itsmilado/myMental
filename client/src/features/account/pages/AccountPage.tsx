// src/features/account/pages/AccountPage.tsx

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

import { API_BASE_URL } from "../../../api/apiClient";

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

    // Profile edit state
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

    // Reauth gated flows
    const [reauthDeleteOpen, setReauthDeleteOpen] = useState(false);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const [reauthPwOpen, setReauthPwOpen] = useState(false);
    const [changePwOpen, setChangePwOpen] = useState(false);
    const [changingPw, setChangingPw] = useState(false);

    const [reauthEmailOpen, setReauthEmailOpen] = useState(false);
    const [changeEmailOpen, setChangeEmailOpen] = useState(false);

    // Link Google (explicit + reauth required)
    const [reauthLinkGoogleOpen, setReauthLinkGoogleOpen] = useState(false);

    const [toast, setToast] = useState<{
        open: boolean;
        message: string;
        severity: "success" | "error" | "info";
    }>({ open: false, message: "", severity: "success" });

    const authProvider = (user as any)?.auth_provider as string | undefined;
    const googleSub = (user as any)?.google_sub as string | undefined | null;
    const role =
        ((user as any)?.user_role as string | undefined) ??
        ((user as any)?.role as string | undefined);

    const isGoogleLinked = Boolean(googleSub) || authProvider === "google";

    // Delete flow
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

    // Change password flow
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

    // Change email flow
    const startChangeEmailFlow = () => setReauthEmailOpen(true);
    const handleReauthEmailSuccess = () => {
        setReauthEmailOpen(false);
        setChangeEmailOpen(true);
    };

    // Save profile
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
            const updatedUser = await updateCurrentUser({
                first_name: firstName.trim(),
                last_name: lastName.trim(),
            });
            setUser(updatedUser);
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

    // explicit linking (reauth gated) -> redirect to server intent=link
    const startLinkGoogleFlow = () => setReauthLinkGoogleOpen(true);
    const handleReauthLinkGoogleSuccess = () => {
        setReauthLinkGoogleOpen(false);

        window.location.assign(`${API_BASE_URL}/auth/google?intent=link`);
    };

    if (!user) {
        return (
            <Box>
                <Typography variant="h4" fontWeight="bold" gutterBottom>
                    Account
                </Typography>
                <Alert severity="info">
                    Please sign in to view your account.
                </Alert>
            </Box>
        );
    }

    return (
        <Box>
            <Typography variant="h4" fontWeight="bold" gutterBottom>
                Account
            </Typography>

            <Stack spacing={2}>
                {/* Profile */}
                <Paper sx={{ p: 3 }}>
                    <Stack spacing={2}>
                        <Stack
                            direction={{ xs: "column", sm: "row" }}
                            spacing={1}
                            alignItems={{ xs: "flex-start", sm: "center" }}
                            justifyContent="space-between"
                        >
                            <Typography variant="h6" fontWeight={700}>
                                Profile
                            </Typography>

                            {!editingProfile ? (
                                <Button
                                    variant="outlined"
                                    onClick={() => setEditingProfile(true)}
                                >
                                    Edit
                                </Button>
                            ) : (
                                <Stack direction="row" spacing={1}>
                                    <Button
                                        onClick={handleCancelProfileEdit}
                                        disabled={savingProfile}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        variant="contained"
                                        onClick={handleSaveProfile}
                                        disabled={
                                            savingProfile ||
                                            !profileValidation.ok
                                        }
                                    >
                                        Save
                                    </Button>
                                </Stack>
                            )}
                        </Stack>

                        <Divider />

                        <Box>
                            <Typography
                                variant="subtitle2"
                                color="text.secondary"
                            >
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
                            <Typography
                                variant="subtitle2"
                                color="text.secondary"
                            >
                                Email
                            </Typography>
                            <Stack
                                direction={{ xs: "column", sm: "row" }}
                                spacing={1}
                                alignItems={{ xs: "flex-start", sm: "center" }}
                                justifyContent="space-between"
                            >
                                <Typography>{user?.email}</Typography>

                                <Button
                                    variant="outlined"
                                    onClick={startChangeEmailFlow}
                                >
                                    Change email
                                </Button>
                            </Stack>
                        </Box>

                        <Box>
                            <Typography
                                variant="subtitle2"
                                color="text.secondary"
                            >
                                Account meta
                            </Typography>

                            <Stack
                                direction="row"
                                spacing={1}
                                flexWrap="wrap"
                                sx={{ mt: 1 }}
                            >
                                {role ? <Chip label={`Role: ${role}`} /> : null}
                                <Chip
                                    label={`Provider: ${authProvider || "local"}`}
                                />
                                <Chip
                                    label={
                                        googleSub
                                            ? "Google: linked"
                                            : "Google: not linked"
                                    }
                                    variant={googleSub ? "filled" : "outlined"}
                                />
                            </Stack>
                        </Box>
                    </Stack>
                </Paper>

                {/* Security */}
                <Paper sx={{ p: 3 }}>
                    <Typography variant="h6" fontWeight={700} gutterBottom>
                        Security
                    </Typography>
                    <Divider sx={{ mb: 2 }} />

                    <Stack spacing={2}>
                        <Stack
                            direction={{ xs: "column", sm: "row" }}
                            spacing={1}
                            alignItems={{ xs: "stretch", sm: "center" }}
                            justifyContent="space-between"
                        >
                            <Typography color="text.secondary">
                                Change your password
                            </Typography>
                            <Button
                                variant="outlined"
                                onClick={startChangePasswordFlow}
                            >
                                Change password
                            </Button>
                        </Stack>

                        <Divider />

                        {/* Link Google */}
                        <Stack
                            direction={{ xs: "column", sm: "row" }}
                            spacing={1}
                            alignItems={{ xs: "stretch", sm: "center" }}
                            justifyContent="space-between"
                        >
                            <Box>
                                <Typography color="text.secondary">
                                    Link Google account
                                </Typography>
                                <Typography
                                    variant="body2"
                                    color="text.secondary"
                                >
                                    Linking requires re-authentication and is
                                    never automatic.
                                </Typography>
                            </Box>

                            <Button
                                variant="outlined"
                                onClick={startLinkGoogleFlow}
                            >
                                {isGoogleLinked
                                    ? "Re-link Google"
                                    : "Link Google"}
                            </Button>
                        </Stack>
                    </Stack>
                </Paper>

                {/* Danger zone */}
                <Paper sx={{ p: 3 }}>
                    <Typography
                        variant="h6"
                        fontWeight={700}
                        gutterBottom
                        color="error"
                    >
                        Danger zone
                    </Typography>
                    <Divider sx={{ mb: 2 }} />

                    <Stack
                        direction={{ xs: "column", sm: "row" }}
                        spacing={1}
                        alignItems={{ xs: "stretch", sm: "center" }}
                        justifyContent="space-between"
                    >
                        <Typography color="text.secondary">
                            Permanently delete your account and all data
                        </Typography>
                        <Button
                            color="error"
                            variant="contained"
                            onClick={startDeleteFlow}
                        >
                            Delete account
                        </Button>
                    </Stack>
                </Paper>
            </Stack>

            {/* Reauth gates */}
            <ReauthDialog
                open={reauthDeleteOpen}
                onClose={() => setReauthDeleteOpen(false)}
                onSuccess={handleReauthDeleteSuccess}
            />
            <DeleteAccountConfirmDialog
                open={deleteConfirmOpen}
                loading={deleting}
                onClose={() => setDeleteConfirmOpen(false)}
                onConfirm={handleDelete}
            />

            <ReauthDialog
                open={reauthPwOpen}
                onClose={() => setReauthPwOpen(false)}
                onSuccess={handleReauthPwSuccess}
            />
            <ChangePasswordDialog
                open={changePwOpen}
                loading={changingPw}
                onClose={() => setChangePwOpen(false)}
                onSubmit={handleChangePassword}
            />

            <ReauthDialog
                open={reauthEmailOpen}
                onClose={() => setReauthEmailOpen(false)}
                onSuccess={handleReauthEmailSuccess}
            />
            <ChangeEmailDialog
                open={changeEmailOpen}
                onClose={() => setChangeEmailOpen(false)}
            />

            {/* reauth gate for link Google */}
            <ReauthDialog
                open={reauthLinkGoogleOpen}
                onClose={() => setReauthLinkGoogleOpen(false)}
                onSuccess={handleReauthLinkGoogleSuccess}
            />

            <Snackbar
                open={toast.open}
                autoHideDuration={4500}
                onClose={() => setToast((t) => ({ ...t, open: false }))}
                anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
            >
                <Alert
                    severity={toast.severity}
                    onClose={() => setToast((t) => ({ ...t, open: false }))}
                    variant="filled"
                    sx={{ width: "100%" }}
                >
                    {toast.message}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default AccountPage;
