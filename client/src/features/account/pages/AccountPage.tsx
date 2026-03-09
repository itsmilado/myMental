// src/features/account/pages/AccountPage.tsx

import { useEffect, useMemo, useState } from "react";
import {
    Alert,
    Avatar,
    Box,
    Button,
    Chip,
    Divider,
    Paper,
    Snackbar,
    Stack,
    TextField,
    Typography,
} from "@mui/material";
import { useNavigate, useSearchParams } from "react-router-dom";

import { useAuthStore } from "../../../store/useAuthStore";
import ReauthDialog from "../components/ReauthDialog";
import DeleteAccountConfirmDialog from "../components/DeleteAccountConfirmDialog";
import ChangePasswordDialog from "../components/ChangePasswordDialog";
import ChangeEmailDialog from "../components/ChangeEmailDialog";
import SetPasswordBeforeUnlinkDialog from "../components/SetPasswordBeforeUnlinkDialog";

import {
    changeMyPassword,
    deleteMyAccount,
    requestCurrentEmailConfirmation,
    unlinkGoogleAccount,
    updateCurrentUser,
    startGoogleOAuth,
} from "../../auth/api";

const isValidName = (value: string) => {
    const v = value.trim();
    if (v.length < 1 || v.length > 30) return false;
    return /^[A-Za-zÀ-ÖØ-öø-ÿ -]+$/.test(v);
};

const sectionCardSx = {
    p: { xs: 2, md: 3 },
    borderRadius: 3,
};

type ReauthAction = "delete" | "email" | "link" | "unlink" | "password" | null;

// type ChangePasswordPayload = {
//     currentPassword?: string;
//     newPassword: string;
// };

const AccountPage = () => {
    const user = useAuthStore((s) => s.user);
    const setUser = useAuthStore((s) => s.setUser);
    const clearUser = useAuthStore((s) => s.clearUser);

    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const [editingProfile, setEditingProfile] = useState(false);
    const [savingProfile, setSavingProfile] = useState(false);
    const [firstName, setFirstName] = useState(user?.first_name ?? "");
    const [lastName, setLastName] = useState(user?.last_name ?? "");

    const [reauthOpen, setReauthOpen] = useState(false);
    const [reauthAction, setReauthAction] = useState<ReauthAction>(null);
    const [reauthMode, setReauthMode] = useState<"password" | "google">(
        "password",
    );
    const [reauthTitle, setReauthTitle] = useState("Re-authenticate");
    const [reauthDescription, setReauthDescription] = useState("");
    const [reauthGoogleIntent, setReauthGoogleIntent] = useState<
        "link" | "reauth_email" | "reauth_delete" | "reauth_unlink"
    >("reauth_email");

    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const [changePwOpen, setChangePwOpen] = useState(false);
    const [changingPw, setChangingPw] = useState(false);
    const [setPasswordBeforeUnlinkOpen, setSetPasswordBeforeUnlinkOpen] =
        useState(false);

    const [changeEmailOpen, setChangeEmailOpen] = useState(false);

    const [sendingEmailConfirm, setSendingEmailConfirm] = useState(false);
    const [removingGoogle, setRemovingGoogle] = useState(false);

    const [toast, setToast] = useState<{
        open: boolean;
        message: string;
        severity: "success" | "error" | "info";
    }>({ open: false, message: "", severity: "success" });

    useEffect(() => {
        setFirstName(user?.first_name ?? "");
        setLastName(user?.last_name ?? "");
    }, [user?.first_name, user?.last_name]);

    const profileValidation = useMemo(() => {
        if (!editingProfile) return { ok: true, reason: "" };

        if (!isValidName(firstName)) {
            return { ok: false, reason: "First name must be 1–30 letters." };
        }

        if (!isValidName(lastName)) {
            return { ok: false, reason: "Last name must be 1–30 letters." };
        }

        return { ok: true, reason: "" };
    }, [editingProfile, firstName, lastName]);

    const authProvider = user?.auth_provider ?? "local";
    const hasGoogleConnection = Boolean(user?.google_sub);
    const isGooglePrimaryAccount = authProvider === "google";
    const isEmailConfirmed = Boolean(user?.isconfirmed);
    const pendingEmail = user?.pending_email ?? null;
    const role = user?.user_role;

    const initials =
        `${user?.first_name?.[0] ?? ""}${user?.last_name?.[0] ?? ""}`.toUpperCase() ||
        "U";

    const openToast = (
        message: string,
        severity: "success" | "error" | "info",
    ) => {
        setToast({ open: true, message, severity });
    };

    const clearAccountQueryState = () => {
        navigate("/dashboard/account", { replace: true });
    };

    const handleFinishGoogleUnlink = async () => {
        const updated = await unlinkGoogleAccount();
        setUser(updated);
        openToast(
            "Google sign-in has been removed from your account.",
            "success",
        );
    };

    const handleSetPasswordAndUnlinkGoogle = async (newPassword: string) => {
        try {
            setChangingPw(true);
            setRemovingGoogle(true);

            await changeMyPassword(newPassword);
            const updated = await unlinkGoogleAccount();

            setUser(updated);
            setSetPasswordBeforeUnlinkOpen(false);
            openToast(
                "Password created and Google sign-in removed successfully.",
                "success",
            );
        } catch (e: any) {
            openToast(
                e?.message || "Failed to remove Google sign-in.",
                "error",
            );
            throw e;
        } finally {
            setChangingPw(false);
            setRemovingGoogle(false);
        }
    };

    useEffect(() => {
        const reauth = searchParams.get("reauth");
        const intent = searchParams.get("intent");
        const linked = searchParams.get("linked");
        const message = searchParams.get("message");
        const error = searchParams.get("error");

        if (!reauth && !linked && !message && !error) return;

        const run = async () => {
            try {
                if (linked === "1") {
                    openToast(
                        message || "Google account linked successfully.",
                        "success",
                    );
                }

                if (reauth === "success") {
                    if (intent === "email") {
                        setChangeEmailOpen(true);
                    } else if (intent === "delete") {
                        setDeleteConfirmOpen(true);
                    } else if (intent === "unlink") {
                        if (isGooglePrimaryAccount) {
                            setSetPasswordBeforeUnlinkOpen(true);
                        } else {
                            setRemovingGoogle(true);
                            await handleFinishGoogleUnlink();
                        }
                    }

                    if (intent !== "unlink") {
                        openToast(message || "Identity confirmed.", "success");
                    }
                }

                if (error) {
                    openToast(error, "error");
                }
            } catch (e: any) {
                openToast(e?.message || "Action failed.", "error");
            } finally {
                setRemovingGoogle(false);
                clearAccountQueryState();
            }
        };

        void run();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParams, user?.id, user?.email, authProvider]);

    const handleSaveProfile = async () => {
        if (!profileValidation.ok) {
            openToast(profileValidation.reason, "error");
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
            openToast("Profile updated.", "success");
        } catch (e: any) {
            openToast(e?.message || "Failed to update profile.", "error");
        } finally {
            setSavingProfile(false);
        }
    };

    const handleCancelProfileEdit = () => {
        setFirstName(user?.first_name ?? "");
        setLastName(user?.last_name ?? "");
        setEditingProfile(false);
    };

    const handleDelete = async () => {
        try {
            setDeleting(true);
            await deleteMyAccount();
            clearUser();
            navigate("/", { replace: true });
        } catch (e: any) {
            openToast(e?.message || "Failed to delete account.", "error");
        } finally {
            setDeleting(false);
            setDeleteConfirmOpen(false);
        }
    };

    const handleChangePassword = async ({
        currentPassword,
        newPassword,
    }: {
        currentPassword?: string;
        newPassword: string;
    }) => {
        try {
            setChangingPw(true);
            const msg = await changeMyPassword(newPassword, currentPassword);
            openToast(msg || "Password updated.", "success");
            setChangePwOpen(false);
        } catch (e: any) {
            openToast(e?.message || "Failed to update password.", "error");
            return;
        } finally {
            setChangingPw(false);
        }
    };

    const handleSendCurrentEmailConfirmation = async () => {
        try {
            setSendingEmailConfirm(true);
            const msg = await requestCurrentEmailConfirmation();
            openToast(
                msg || "Confirmation email sent. Please check your inbox.",
                "success",
            );
        } catch (e: any) {
            openToast(
                e?.message || "Failed to send confirmation email.",
                "error",
            );
        } finally {
            setSendingEmailConfirm(false);
        }
    };

    const openPasswordReauth = (
        action: Exclude<ReauthAction, null>,
        title: string,
        description: string,
    ) => {
        setReauthAction(action);
        setReauthMode("password");
        setReauthTitle(title);
        setReauthDescription(description);
        setReauthGoogleIntent("reauth_email");
        setReauthOpen(true);
    };

    const openGoogleReauth = (
        action: Exclude<ReauthAction, null>,
        title: string,
        description: string,
        intent: "link" | "reauth_email" | "reauth_delete" | "reauth_unlink",
    ) => {
        setReauthAction(action);
        setReauthMode("google");
        setReauthTitle(title);
        setReauthDescription(description);
        setReauthGoogleIntent(intent);
        setReauthOpen(true);
    };

    const startChangeEmailFlow = () => {
        if (hasGoogleConnection) {
            openGoogleReauth(
                "email",
                "Confirm email change",
                "Continue with Google to verify your identity before changing your email.",
                "reauth_email",
            );
            return;
        }

        openPasswordReauth(
            "email",
            "Confirm email change",
            "Enter your current password to continue with the email change.",
        );
    };

    const startDeleteFlow = () => {
        if (hasGoogleConnection) {
            openGoogleReauth(
                "delete",
                "Confirm account deletion",
                "Continue with Google to verify your identity before deleting your account.",
                "reauth_delete",
            );
            return;
        }

        openPasswordReauth(
            "delete",
            "Confirm account deletion",
            "Enter your current password before deleting your account.",
        );
    };

    const startLinkGoogleFlow = () => {
        openPasswordReauth(
            "link",
            "Confirm Google linking",
            "Enter your password before linking Google sign-in to this account.",
        );
    };

    const startUnlinkGoogleFlow = () => {
        openGoogleReauth(
            "unlink",
            "Confirm Google removal",
            isGooglePrimaryAccount
                ? "Continue with Google to verify your identity. After that, you'll set a password and remove Google sign-in."
                : "Continue with Google to verify your identity before removing Google sign-in.",
            "reauth_unlink",
        );
    };

    const startChangePasswordFlow = () => {
        setReauthAction("password");
        setReauthMode("password");
        setReauthTitle("Confirm password change");
        setReauthDescription(
            "Please confirm your current password before changing it.",
        );
        setReauthGoogleIntent("reauth_email");
        setReauthOpen(true);
    };

    const handlePasswordReauthSuccess = () => {
        setReauthOpen(false);

        if (reauthAction === "email") {
            setChangeEmailOpen(true);
            setReauthAction(null);
            openToast("Identity confirmed.", "success");
            return;
        }

        if (reauthAction === "delete") {
            setDeleteConfirmOpen(true);
            setReauthAction(null);
            openToast("Identity confirmed.", "success");
            return;
        }

        if (reauthAction === "password") {
            setChangePwOpen(true);
            setReauthAction(null);
            openToast("Identity confirmed.", "success");
            return;
        }

        if (reauthAction === "link") {
            setReauthAction(null);
            startGoogleOAuth("link");
            return;
        }

        setReauthAction(null);
        openToast("Identity confirmed.", "success");
    };
    if (!user) {
        return (
            <Box>
                <Typography variant="h4" fontWeight={700} gutterBottom>
                    Account
                </Typography>
                <Alert severity="info">
                    Please sign in to view your account.
                </Alert>
            </Box>
        );
    }

    return (
        <Box sx={{ maxWidth: 980, mx: "auto", pb: 4 }}>
            <Stack spacing={3}>
                <Box>
                    <Typography variant="h4" fontWeight={700} gutterBottom>
                        Account
                    </Typography>
                    <Typography color="text.secondary">
                        Manage your profile, email status, connected sign-in
                        methods, and account security.
                    </Typography>
                </Box>

                <Paper sx={sectionCardSx}>
                    <Stack
                        direction={{ xs: "column", md: "row" }}
                        spacing={3}
                        alignItems={{ xs: "flex-start", md: "center" }}
                        justifyContent="space-between"
                    >
                        <Stack direction="row" spacing={2} alignItems="center">
                            <Avatar
                                sx={{
                                    width: 64,
                                    height: 64,
                                    fontSize: 24,
                                    fontWeight: 700,
                                }}
                            >
                                {initials}
                            </Avatar>

                            <Box>
                                <Typography variant="h5" fontWeight={700}>
                                    {user.first_name} {user.last_name}
                                </Typography>

                                <Typography color="text.secondary">
                                    {user.email}
                                </Typography>

                                <Stack
                                    direction="row"
                                    spacing={1}
                                    useFlexGap
                                    flexWrap="wrap"
                                    sx={{ mt: 1.5 }}
                                >
                                    <Chip
                                        size="small"
                                        label={
                                            isEmailConfirmed
                                                ? "Email confirmed"
                                                : "Email not confirmed"
                                        }
                                        color={
                                            isEmailConfirmed
                                                ? "success"
                                                : "warning"
                                        }
                                        variant={
                                            isEmailConfirmed
                                                ? "filled"
                                                : "outlined"
                                        }
                                    />
                                    <Chip
                                        size="small"
                                        label={`Provider: ${authProvider}`}
                                        variant="outlined"
                                    />
                                    <Chip
                                        size="small"
                                        label={
                                            hasGoogleConnection
                                                ? "Google connected"
                                                : "Google not connected"
                                        }
                                        variant={
                                            hasGoogleConnection
                                                ? "filled"
                                                : "outlined"
                                        }
                                    />
                                    {role ? (
                                        <Chip
                                            size="small"
                                            label={`Role: ${role}`}
                                            variant="outlined"
                                        />
                                    ) : null}
                                </Stack>
                            </Box>
                        </Stack>
                    </Stack>
                </Paper>

                {!isEmailConfirmed || pendingEmail ? (
                    <Paper sx={sectionCardSx}>
                        <Stack spacing={2}>
                            <Box>
                                <Typography variant="h6" fontWeight={700}>
                                    Email status
                                </Typography>
                                <Typography
                                    variant="body2"
                                    color="text.secondary"
                                >
                                    Confirming your email helps secure account
                                    recovery and ensures you can receive
                                    password reset links, confirmation links,
                                    and other important account notices.
                                </Typography>
                            </Box>

                            {pendingEmail ? (
                                <Alert severity="info">
                                    Pending confirmation for{" "}
                                    <strong>{pendingEmail}</strong>. Check that
                                    inbox and click the confirmation link to
                                    finish the email change.
                                </Alert>
                            ) : null}

                            {!isEmailConfirmed ? (
                                <Stack
                                    direction={{ xs: "column", sm: "row" }}
                                    spacing={2}
                                    justifyContent="space-between"
                                    alignItems={{
                                        xs: "flex-start",
                                        sm: "center",
                                    }}
                                >
                                    <Alert severity="warning" sx={{ flex: 1 }}>
                                        Your current email is not confirmed yet.
                                    </Alert>

                                    <Button
                                        variant="contained"
                                        onClick={
                                            handleSendCurrentEmailConfirmation
                                        }
                                        disabled={sendingEmailConfirm}
                                    >
                                        Confirm email
                                    </Button>
                                </Stack>
                            ) : null}
                        </Stack>
                    </Paper>
                ) : null}

                <Paper sx={sectionCardSx}>
                    <Stack spacing={2.5}>
                        <Stack
                            direction={{ xs: "column", sm: "row" }}
                            alignItems={{ xs: "flex-start", sm: "center" }}
                            justifyContent="space-between"
                            spacing={1.5}
                        >
                            <Box>
                                <Typography variant="h6" fontWeight={700}>
                                    Profile
                                </Typography>
                                <Typography
                                    variant="body2"
                                    color="text.secondary"
                                >
                                    Keep your account identity accurate and easy
                                    to recognize.
                                </Typography>
                            </Box>

                            {!editingProfile ? (
                                <Button
                                    variant="contained"
                                    onClick={() => setEditingProfile(true)}
                                >
                                    Edit profile
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
                                        Save changes
                                    </Button>
                                </Stack>
                            )}
                        </Stack>

                        <Divider />

                        {!editingProfile ? (
                            <Box
                                sx={{
                                    display: "grid",
                                    gridTemplateColumns: {
                                        xs: "1fr",
                                        sm: "1fr 1fr",
                                    },
                                    gap: 2,
                                }}
                            >
                                <Box>
                                    <Typography
                                        variant="caption"
                                        color="text.secondary"
                                    >
                                        First name
                                    </Typography>
                                    <Typography
                                        variant="body1"
                                        fontWeight={600}
                                    >
                                        {user.first_name}
                                    </Typography>
                                </Box>

                                <Box>
                                    <Typography
                                        variant="caption"
                                        color="text.secondary"
                                    >
                                        Last name
                                    </Typography>
                                    <Typography
                                        variant="body1"
                                        fontWeight={600}
                                    >
                                        {user.last_name}
                                    </Typography>
                                </Box>
                            </Box>
                        ) : (
                            <Box
                                sx={{
                                    display: "grid",
                                    gridTemplateColumns: {
                                        xs: "1fr",
                                        sm: "1fr 1fr",
                                    },
                                    gap: 2,
                                }}
                            >
                                <TextField
                                    label="First name"
                                    value={firstName}
                                    onChange={(e) =>
                                        setFirstName(e.target.value)
                                    }
                                    disabled={savingProfile}
                                    fullWidth
                                    helperText="Use your preferred first name."
                                />

                                <TextField
                                    label="Last name"
                                    value={lastName}
                                    onChange={(e) =>
                                        setLastName(e.target.value)
                                    }
                                    disabled={savingProfile}
                                    fullWidth
                                    helperText="Use your preferred last name."
                                />
                            </Box>
                        )}
                    </Stack>
                </Paper>

                <Paper sx={sectionCardSx}>
                    <Stack spacing={2.5}>
                        <Stack
                            direction={{ xs: "column", sm: "row" }}
                            spacing={2}
                            alignItems={{ xs: "flex-start", sm: "center" }}
                            justifyContent="space-between"
                        >
                            <Box>
                                <Typography variant="h6" fontWeight={700}>
                                    Email
                                </Typography>
                                <Typography
                                    variant="body2"
                                    color="text.secondary"
                                >
                                    Changing your email requires identity
                                    verification and inbox confirmation to
                                    prevent unauthorized account changes.
                                </Typography>
                            </Box>

                            <Button
                                variant="outlined"
                                onClick={startChangeEmailFlow}
                            >
                                Change email
                            </Button>
                        </Stack>

                        <Divider />

                        <Stack
                            direction={{ xs: "column", sm: "row" }}
                            spacing={2}
                            alignItems={{ xs: "flex-start", sm: "center" }}
                            justifyContent="space-between"
                        >
                            <Box>
                                <Typography
                                    variant="caption"
                                    color="text.secondary"
                                >
                                    Current email
                                </Typography>
                                <Typography variant="body1" fontWeight={600}>
                                    {user.email}
                                </Typography>
                            </Box>

                            <Chip
                                label={
                                    isEmailConfirmed
                                        ? "Confirmed"
                                        : "Not confirmed"
                                }
                                color={isEmailConfirmed ? "success" : "warning"}
                                variant={
                                    isEmailConfirmed ? "filled" : "outlined"
                                }
                            />
                        </Stack>
                    </Stack>
                </Paper>

                {hasGoogleConnection ? (
                    <Paper sx={sectionCardSx}>
                        <Stack spacing={2.5}>
                            <Box>
                                <Typography variant="h6" fontWeight={700}>
                                    Connected accounts
                                </Typography>
                                <Typography
                                    variant="body2"
                                    color="text.secondary"
                                >
                                    Manage third-party sign-in methods linked to
                                    this account.
                                </Typography>
                            </Box>

                            <Divider />

                            <Stack
                                direction={{ xs: "column", sm: "row" }}
                                spacing={2}
                                alignItems={{ xs: "flex-start", sm: "center" }}
                                justifyContent="space-between"
                            >
                                <Box>
                                    <Typography fontWeight={600}>
                                        Google
                                    </Typography>
                                    <Typography
                                        variant="body2"
                                        color="text.secondary"
                                        sx={{ mt: 0.5 }}
                                    >
                                        {isGooglePrimaryAccount
                                            ? "This account currently uses Google as its primary sign-in method."
                                            : "Google is linked to this account as an additional sign-in method."}
                                    </Typography>
                                </Box>

                                <Stack
                                    direction="row"
                                    spacing={1}
                                    alignItems="center"
                                >
                                    <Chip
                                        label="Connected"
                                        color="success"
                                        variant="filled"
                                    />
                                    <Button
                                        variant="outlined"
                                        color="warning"
                                        onClick={startUnlinkGoogleFlow}
                                        disabled={removingGoogle}
                                    >
                                        Remove Google link
                                    </Button>
                                </Stack>
                            </Stack>

                            {isGooglePrimaryAccount ? (
                                <Alert severity="info">
                                    To remove Google sign-in from a
                                    Google-created account, verify with Google
                                    first. You'll then create a password and
                                    remove Google sign-in in one step.
                                </Alert>
                            ) : null}
                        </Stack>
                    </Paper>
                ) : (
                    <>
                        <Paper sx={sectionCardSx}>
                            <Stack spacing={2.5}>
                                <Box>
                                    <Typography variant="h6" fontWeight={700}>
                                        Security
                                    </Typography>
                                    <Typography
                                        variant="body2"
                                        color="text.secondary"
                                    >
                                        Manage your password-based sign-in and
                                        account protection.
                                    </Typography>
                                </Box>

                                <Divider />

                                <Stack
                                    direction={{ xs: "column", sm: "row" }}
                                    spacing={2}
                                    alignItems={{
                                        xs: "flex-start",
                                        sm: "center",
                                    }}
                                    justifyContent="space-between"
                                >
                                    <Box>
                                        <Typography fontWeight={600}>
                                            Password
                                        </Typography>
                                        <Typography
                                            variant="body2"
                                            color="text.secondary"
                                            sx={{ mt: 0.5 }}
                                        >
                                            Update your password after
                                            confirming your identity.
                                        </Typography>
                                    </Box>

                                    <Button
                                        variant="outlined"
                                        onClick={startChangePasswordFlow}
                                    >
                                        Change password
                                    </Button>
                                </Stack>
                            </Stack>
                        </Paper>

                        <Paper sx={sectionCardSx}>
                            <Stack spacing={2.5}>
                                <Box>
                                    <Typography variant="h6" fontWeight={700}>
                                        Connected accounts
                                    </Typography>
                                    <Typography
                                        variant="body2"
                                        color="text.secondary"
                                    >
                                        You can link Google for faster sign-in
                                        and provider-based verification flows.
                                    </Typography>
                                </Box>

                                <Divider />

                                <Stack
                                    direction={{ xs: "column", sm: "row" }}
                                    spacing={2}
                                    alignItems={{
                                        xs: "flex-start",
                                        sm: "center",
                                    }}
                                    justifyContent="space-between"
                                >
                                    <Box>
                                        <Typography fontWeight={600}>
                                            Google
                                        </Typography>
                                        <Typography
                                            variant="body2"
                                            color="text.secondary"
                                            sx={{ mt: 0.5 }}
                                        >
                                            Link Google to your existing
                                            account.
                                        </Typography>
                                    </Box>

                                    <Button
                                        variant="outlined"
                                        onClick={startLinkGoogleFlow}
                                    >
                                        Link Google
                                    </Button>
                                </Stack>
                            </Stack>
                        </Paper>
                    </>
                )}

                <Paper
                    sx={{
                        ...sectionCardSx,
                        border: (theme) =>
                            `1px solid ${theme.palette.error.light}`,
                    }}
                >
                    <Stack spacing={2.5}>
                        <Box>
                            <Typography
                                variant="h6"
                                fontWeight={700}
                                color="error"
                            >
                                Danger zone
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Permanently delete your account and associated
                                data. This action cannot be undone.
                            </Typography>
                        </Box>

                        <Divider />

                        <Stack
                            direction={{ xs: "column", sm: "row" }}
                            spacing={2}
                            alignItems={{ xs: "flex-start", sm: "center" }}
                            justifyContent="space-between"
                        >
                            <Typography color="text.secondary">
                                Delete your account permanently
                            </Typography>

                            <Button
                                color="error"
                                variant="contained"
                                onClick={startDeleteFlow}
                            >
                                Delete account
                            </Button>
                        </Stack>
                    </Stack>
                </Paper>
            </Stack>

            <ReauthDialog
                open={reauthOpen}
                onClose={() => setReauthOpen(false)}
                onSuccess={handlePasswordReauthSuccess}
                mode={reauthMode}
                title={reauthTitle}
                description={reauthDescription}
                googleIntent={reauthGoogleIntent}
            />

            <DeleteAccountConfirmDialog
                open={deleteConfirmOpen}
                loading={deleting}
                onClose={() => setDeleteConfirmOpen(false)}
                onConfirm={handleDelete}
            />

            <ChangePasswordDialog
                open={changePwOpen}
                loading={changingPw}
                onClose={() => setChangePwOpen(false)}
                onSubmit={handleChangePassword}
                requireCurrentPassword={!hasGoogleConnection}
            />

            <SetPasswordBeforeUnlinkDialog
                open={setPasswordBeforeUnlinkOpen}
                loading={changingPw || removingGoogle}
                onClose={() => setSetPasswordBeforeUnlinkOpen(false)}
                onSubmit={handleSetPasswordAndUnlinkGoogle}
            />

            <ChangeEmailDialog
                open={changeEmailOpen}
                onClose={() => setChangeEmailOpen(false)}
                onInfo={(message) => openToast(message, "info")}
                currentEmail={user.email}
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
