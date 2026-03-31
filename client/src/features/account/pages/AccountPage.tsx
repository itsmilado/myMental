// src/features/account/pages/AccountPage.tsx

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    Alert,
    Avatar,
    Box,
    Button,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    Paper,
    Snackbar,
    Stack,
    Switch,
    TextField,
    Typography,
} from "@mui/material";
import { useNavigate, useSearchParams } from "react-router-dom";

import DocumentTitle from "../../../components/global/DocumentTitle";

import { useAuthStore } from "../../../store/useAuthStore";
import ReauthDialog from "../components/ReauthDialog";
import DeleteAccountConfirmDialog from "../components/DeleteAccountConfirmDialog";
import ChangePasswordDialog from "../components/ChangePasswordDialog";
import ChangeEmailDialog from "../components/ChangeEmailDialog";
import SetPasswordBeforeUnlinkDialog from "../components/SetPasswordBeforeUnlinkDialog";

import {
    changeMyPassword,
    createMyAssemblyConnection,
    deleteMyAccount,
    deleteMyAssemblyConnection,
    fetchMyAssemblyConnections,
    requestCurrentEmailConfirmation,
    setDefaultMyAssemblyConnection,
    unlinkGoogleAccount,
    updateCurrentUser,
    updateMyAssemblyConnection,
    startGoogleOAuth,
} from "../../auth/api";

import type {
    AssemblyAiConnection,
    CreateAssemblyAiConnectionPayload,
    UpdateAssemblyAiConnectionPayload,
} from "../../../types/types";

const isValidName = (value: string) => {
    const v = value.trim();
    if (v.length < 1 || v.length > 30) return false;
    return /^[A-Za-zÀ-ÖØ-öø-ÿ -]+$/.test(v);
};

const sectionCardSx = {
    p: { xs: 2, md: 3 },
    borderRadius: 3,
};

type ReauthAction =
    | "delete"
    | "email"
    | "link"
    | "unlink"
    | "password"
    | "assembly_connection"
    | null;

type ConnectionDialogMode = "create" | "edit_label" | "replace_key" | null;

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

    const [assemblyConnections, setAssemblyConnections] = useState<
        AssemblyAiConnection[]
    >([]);
    const [connectionsLoading, setConnectionsLoading] = useState(false);
    const [connectionsSaving, setConnectionsSaving] = useState(false);
    const [connectionsError, setConnectionsError] = useState<string | null>(
        null,
    );
    const [connectionDialogOpen, setConnectionDialogOpen] = useState(false);
    const [connectionDialogMode, setConnectionDialogMode] =
        useState<ConnectionDialogMode>(null);
    const [connectionTarget, setConnectionTarget] =
        useState<AssemblyAiConnection | null>(null);
    const [connectionDeleteTarget, setConnectionDeleteTarget] =
        useState<AssemblyAiConnection | null>(null);
    const [connectionLabel, setConnectionLabel] = useState("");
    const [connectionApiKey, setConnectionApiKey] = useState("");
    const [connectionIsDefault, setConnectionIsDefault] = useState(false);
    const [settingDefaultId, setSettingDefaultId] = useState<number | null>(
        null,
    );

    const pendingProtectedActionRef = useRef<null | (() => Promise<void>)>(
        null,
    );

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

    const formatConnectionDate = (value: string | null) => {
        if (!value) return "Not validated yet";

        const date = new Date(value);
        if (Number.isNaN(date.getTime())) {
            return "Not validated yet";
        }

        return date.toLocaleString();
    };

    const resetConnectionDialogState = () => {
        setConnectionDialogOpen(false);
        setConnectionDialogMode(null);
        setConnectionTarget(null);
        setConnectionLabel("");
        setConnectionApiKey("");
        setConnectionIsDefault(false);
    };

    const loadAssemblyConnections = useCallback(async () => {
        if (!user?.id) return;

        try {
            setConnectionsLoading(true);
            setConnectionsError(null);

            const connections = await fetchMyAssemblyConnections();
            setAssemblyConnections(connections);
        } catch (e: any) {
            setConnectionsError(
                e?.message || "Failed to load AssemblyAI connections.",
            );
        } finally {
            setConnectionsLoading(false);
        }
    }, [user?.id]);

    const openCreateConnectionDialog = () => {
        setConnectionDialogMode("create");
        setConnectionTarget(null);
        setConnectionLabel("");
        setConnectionApiKey("");
        setConnectionIsDefault(false);
        setConnectionDialogOpen(true);
    };

    const openEditConnectionDialog = (connection: AssemblyAiConnection) => {
        setConnectionDialogMode("edit_label");
        setConnectionTarget(connection);
        setConnectionLabel(connection.label);
        setConnectionApiKey("");
        setConnectionIsDefault(connection.is_default);
        setConnectionDialogOpen(true);
    };

    const openReplaceConnectionDialog = (connection: AssemblyAiConnection) => {
        setConnectionDialogMode("replace_key");
        setConnectionTarget(connection);
        setConnectionLabel(connection.label);
        setConnectionApiKey("");
        setConnectionIsDefault(connection.is_default);
        setConnectionDialogOpen(true);
    };

    useEffect(() => {
        void loadAssemblyConnections();
    }, [loadAssemblyConnections]);

    const handleProtectedConnectionAction = async (
        action: () => Promise<void>,
        description: string,
    ) => {
        try {
            await action();
        } catch (e: any) {
            const message = String(e?.message || "");

            if (
                message.toLowerCase().includes("re-authentication required") ||
                message.toLowerCase().includes("reauthentication required")
            ) {
                if (isGooglePrimaryAccount) {
                    openToast(
                        "This action requires recent re-authentication. Password-based re-authentication is the active flow in this Account page right now.",
                        "info",
                    );
                    return;
                }

                pendingProtectedActionRef.current = action;
                setReauthAction("assembly_connection");
                setReauthMode("password");
                setReauthTitle("Confirm AssemblyAI connection change");
                setReauthDescription(description);
                setReauthGoogleIntent("reauth_email");
                setReauthOpen(true);
                return;
            }

            throw e;
        }
    };

    const handleSaveConnection = async () => {
        const trimmedLabel = connectionLabel.trim();
        const trimmedApiKey = connectionApiKey.trim();

        if (connectionDialogMode === "create") {
            if (!trimmedLabel) {
                openToast("Connection label is required.", "error");
                return;
            }

            if (!trimmedApiKey) {
                openToast("AssemblyAI API key is required.", "error");
                return;
            }

            const payload: CreateAssemblyAiConnectionPayload = {
                label: trimmedLabel,
                api_key: trimmedApiKey,
                is_default: connectionIsDefault,
            };

            try {
                setConnectionsSaving(true);

                await handleProtectedConnectionAction(async () => {
                    await createMyAssemblyConnection(payload);
                    await loadAssemblyConnections();
                    resetConnectionDialogState();
                    openToast("AssemblyAI connection saved.", "success");
                }, "Enter your current password to continue saving this AssemblyAI connection.");
            } catch (e: any) {
                openToast(
                    e?.message || "Failed to save AssemblyAI connection.",
                    "error",
                );
            } finally {
                setConnectionsSaving(false);
            }

            return;
        }

        if (!connectionTarget) {
            openToast("No AssemblyAI connection selected.", "error");
            return;
        }

        if (connectionDialogMode === "edit_label") {
            if (!trimmedLabel) {
                openToast("Connection label cannot be empty.", "error");
                return;
            }

            const payload: UpdateAssemblyAiConnectionPayload = {
                label: trimmedLabel,
            };

            try {
                setConnectionsSaving(true);
                await updateMyAssemblyConnection(connectionTarget.id, payload);
                await loadAssemblyConnections();
                resetConnectionDialogState();
                openToast("AssemblyAI connection updated.", "success");
            } catch (e: any) {
                openToast(
                    e?.message || "Failed to update AssemblyAI connection.",
                    "error",
                );
            } finally {
                setConnectionsSaving(false);
            }

            return;
        }

        if (connectionDialogMode === "replace_key") {
            if (!trimmedApiKey) {
                openToast("AssemblyAI API key is required.", "error");
                return;
            }

            const payload: UpdateAssemblyAiConnectionPayload = {
                api_key: trimmedApiKey,
            };

            try {
                setConnectionsSaving(true);

                await handleProtectedConnectionAction(async () => {
                    await updateMyAssemblyConnection(
                        connectionTarget.id,
                        payload,
                    );
                    await loadAssemblyConnections();
                    resetConnectionDialogState();
                    openToast("AssemblyAI key replaced.", "success");
                }, "Enter your current password to continue replacing this AssemblyAI key.");
            } catch (e: any) {
                openToast(
                    e?.message || "Failed to replace AssemblyAI key.",
                    "error",
                );
            } finally {
                setConnectionsSaving(false);
            }
        }
    };

    const handleDeleteConnection = async () => {
        if (!connectionDeleteTarget) {
            openToast("No AssemblyAI connection selected.", "error");
            return;
        }

        try {
            setConnectionsSaving(true);

            await handleProtectedConnectionAction(async () => {
                await deleteMyAssemblyConnection(connectionDeleteTarget.id);
                await loadAssemblyConnections();
                setConnectionDeleteTarget(null);
                openToast("AssemblyAI connection removed.", "success");
            }, "Enter your current password to continue removing this AssemblyAI connection.");
        } catch (e: any) {
            openToast(
                e?.message || "Failed to remove AssemblyAI connection.",
                "error",
            );
        } finally {
            setConnectionsSaving(false);
        }
    };

    const handleSetDefaultConnection = async (
        connection: AssemblyAiConnection,
    ) => {
        try {
            setSettingDefaultId(connection.id);
            await setDefaultMyAssemblyConnection(connection.id);
            await loadAssemblyConnections();
            openToast("Default AssemblyAI connection updated.", "success");
        } catch (e: any) {
            openToast(
                e?.message || "Failed to update default AssemblyAI connection.",
                "error",
            );
        } finally {
            setSettingDefaultId(null);
        }
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

        if (reauthAction === "assembly_connection") {
            const pendingAction = pendingProtectedActionRef.current;
            pendingProtectedActionRef.current = null;
            setReauthAction(null);

            if (pendingAction) {
                void pendingAction().catch((e: any) => {
                    openToast(
                        e?.message || "AssemblyAI action failed.",
                        "error",
                    );
                });
            }

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
        <>
            <DocumentTitle title="Account" />
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
                            <Stack
                                direction="row"
                                spacing={2}
                                alignItems="center"
                            >
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
                                        Confirming your email helps secure
                                        account recovery and ensures you can
                                        receive password reset links,
                                        confirmation links, and other important
                                        account notices.
                                    </Typography>
                                </Box>

                                {pendingEmail ? (
                                    <Alert severity="info">
                                        Pending confirmation for{" "}
                                        <strong>{pendingEmail}</strong>. Check
                                        that inbox and click the confirmation
                                        link to finish the email change.
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
                                        <Alert
                                            severity="warning"
                                            sx={{ flex: 1 }}
                                        >
                                            Your current email is not confirmed
                                            yet.
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
                                        Keep your account identity accurate and
                                        easy to recognize.
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
                                    <Typography
                                        variant="body1"
                                        fontWeight={600}
                                    >
                                        {user.email}
                                    </Typography>
                                </Box>

                                <Chip
                                    label={
                                        isEmailConfirmed
                                            ? "Confirmed"
                                            : "Not confirmed"
                                    }
                                    color={
                                        isEmailConfirmed ? "success" : "warning"
                                    }
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
                                        Manage third-party sign-in methods
                                        linked to this account.
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
                                        Google-created account, verify with
                                        Google first. You'll then create a
                                        password and remove Google sign-in in
                                        one step.
                                    </Alert>
                                ) : null}
                            </Stack>
                        </Paper>
                    ) : (
                        <>
                            <Paper sx={sectionCardSx}>
                                <Stack spacing={2.5}>
                                    <Box>
                                        <Typography
                                            variant="h6"
                                            fontWeight={700}
                                        >
                                            Security
                                        </Typography>
                                        <Typography
                                            variant="body2"
                                            color="text.secondary"
                                        >
                                            Manage your password-based sign-in
                                            and account protection.
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
                                        <Typography
                                            variant="h6"
                                            fontWeight={700}
                                        >
                                            Connected accounts
                                        </Typography>
                                        <Typography
                                            variant="body2"
                                            color="text.secondary"
                                        >
                                            You can link Google for faster
                                            sign-in and provider-based
                                            verification flows.
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
                                        AssemblyAI connections
                                    </Typography>
                                    <Typography
                                        variant="body2"
                                        color="text.secondary"
                                    >
                                        Manage the AssemblyAI API keys saved to
                                        your account. Protected changes require
                                        recent re-authentication.
                                    </Typography>
                                </Box>

                                <Button
                                    variant="contained"
                                    onClick={openCreateConnectionDialog}
                                >
                                    Add connection
                                </Button>
                            </Stack>

                            <Divider />

                            {isGooglePrimaryAccount ? (
                                <Alert severity="info">
                                    This page currently uses the password-based
                                    re-authentication flow for protected
                                    AssemblyAI connection changes.
                                </Alert>
                            ) : null}

                            {connectionsError ? (
                                <Alert severity="error">
                                    {connectionsError}
                                </Alert>
                            ) : null}

                            {connectionsLoading ? (
                                <Box
                                    sx={{
                                        py: 4,
                                        display: "flex",
                                        justifyContent: "center",
                                    }}
                                >
                                    <CircularProgress size={28} />
                                </Box>
                            ) : assemblyConnections.length === 0 ? (
                                <Alert severity="info">
                                    No AssemblyAI connection has been added yet.
                                </Alert>
                            ) : (
                                <Stack spacing={2}>
                                    {assemblyConnections.map((connection) => (
                                        <Paper
                                            key={connection.id}
                                            variant="outlined"
                                            sx={{
                                                p: 2,
                                                borderRadius: 2,
                                            }}
                                        >
                                            <Stack
                                                spacing={2}
                                                direction={{
                                                    xs: "column",
                                                    md: "row",
                                                }}
                                                justifyContent="space-between"
                                                alignItems={{
                                                    xs: "flex-start",
                                                    md: "center",
                                                }}
                                            >
                                                <Box>
                                                    <Stack
                                                        direction="row"
                                                        spacing={1}
                                                        useFlexGap
                                                        flexWrap="wrap"
                                                        alignItems="center"
                                                        sx={{ mb: 1 }}
                                                    >
                                                        <Typography
                                                            fontWeight={700}
                                                        >
                                                            {connection.label}
                                                        </Typography>

                                                        {connection.is_default ? (
                                                            <Chip
                                                                size="small"
                                                                label="Default"
                                                                color="primary"
                                                            />
                                                        ) : null}

                                                        <Chip
                                                            size="small"
                                                            label={
                                                                connection.status ===
                                                                "active"
                                                                    ? "Active"
                                                                    : "Invalid"
                                                            }
                                                            color={
                                                                connection.status ===
                                                                "active"
                                                                    ? "success"
                                                                    : "warning"
                                                            }
                                                            variant="outlined"
                                                        />
                                                    </Stack>

                                                    <Typography
                                                        variant="body2"
                                                        color="text.secondary"
                                                    >
                                                        {connection.masked_key}
                                                    </Typography>

                                                    <Typography
                                                        variant="caption"
                                                        color="text.secondary"
                                                    >
                                                        Last validated:{" "}
                                                        {formatConnectionDate(
                                                            connection.last_validated_at,
                                                        )}
                                                    </Typography>
                                                </Box>

                                                <Stack
                                                    direction="row"
                                                    spacing={1}
                                                    useFlexGap
                                                    flexWrap="wrap"
                                                >
                                                    {!connection.is_default ? (
                                                        <Button
                                                            size="small"
                                                            variant="outlined"
                                                            onClick={() =>
                                                                handleSetDefaultConnection(
                                                                    connection,
                                                                )
                                                            }
                                                            disabled={
                                                                settingDefaultId ===
                                                                connection.id
                                                            }
                                                        >
                                                            Set default
                                                        </Button>
                                                    ) : null}

                                                    <Button
                                                        size="small"
                                                        variant="outlined"
                                                        onClick={() =>
                                                            openEditConnectionDialog(
                                                                connection,
                                                            )
                                                        }
                                                    >
                                                        Edit label
                                                    </Button>

                                                    <Button
                                                        size="small"
                                                        variant="outlined"
                                                        onClick={() =>
                                                            openReplaceConnectionDialog(
                                                                connection,
                                                            )
                                                        }
                                                    >
                                                        Replace key
                                                    </Button>

                                                    <Button
                                                        size="small"
                                                        color="error"
                                                        variant="outlined"
                                                        onClick={() =>
                                                            setConnectionDeleteTarget(
                                                                connection,
                                                            )
                                                        }
                                                    >
                                                        Delete
                                                    </Button>
                                                </Stack>
                                            </Stack>
                                        </Paper>
                                    ))}
                                </Stack>
                            )}
                        </Stack>
                    </Paper>
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
                                <Typography
                                    variant="body2"
                                    color="text.secondary"
                                >
                                    Permanently delete your account and
                                    associated data. This action cannot be
                                    undone.
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

                <Dialog
                    open={connectionDialogOpen}
                    onClose={() => {
                        if (!connectionsSaving) {
                            resetConnectionDialogState();
                        }
                    }}
                    fullWidth
                    maxWidth="sm"
                >
                    <DialogTitle>
                        {connectionDialogMode === "create"
                            ? "Add AssemblyAI connection"
                            : connectionDialogMode === "edit_label"
                              ? "Edit AssemblyAI connection label"
                              : "Replace AssemblyAI key"}
                    </DialogTitle>

                    <DialogContent>
                        <Stack spacing={2} sx={{ pt: 1 }}>
                            {connectionDialogMode !== "replace_key" ? (
                                <TextField
                                    label="Connection label"
                                    value={connectionLabel}
                                    onChange={(e) =>
                                        setConnectionLabel(e.target.value)
                                    }
                                    fullWidth
                                    disabled={connectionsSaving}
                                    helperText="Use a clear label such as Primary or Backup."
                                />
                            ) : (
                                <TextField
                                    label="Connection label"
                                    value={connectionLabel}
                                    fullWidth
                                    disabled
                                    helperText="The current label stays unchanged while the key is replaced."
                                />
                            )}

                            {connectionDialogMode !== "edit_label" ? (
                                <TextField
                                    label="AssemblyAI API key"
                                    value={connectionApiKey}
                                    onChange={(e) =>
                                        setConnectionApiKey(e.target.value)
                                    }
                                    fullWidth
                                    disabled={connectionsSaving}
                                    type="password"
                                    autoComplete="off"
                                    helperText={
                                        connectionDialogMode === "create"
                                            ? "The key is validated before it is saved."
                                            : "Enter the replacement key for this connection."
                                    }
                                />
                            ) : null}

                            {connectionDialogMode === "create" ? (
                                <Stack
                                    direction="row"
                                    spacing={1}
                                    alignItems="center"
                                >
                                    <Switch
                                        checked={connectionIsDefault}
                                        onChange={(e) =>
                                            setConnectionIsDefault(
                                                e.target.checked,
                                            )
                                        }
                                        disabled={connectionsSaving}
                                    />
                                    <Typography variant="body2">
                                        Set as default connection
                                    </Typography>
                                </Stack>
                            ) : null}
                        </Stack>
                    </DialogContent>

                    <DialogActions sx={{ px: 3, pb: 3 }}>
                        <Button
                            onClick={resetConnectionDialogState}
                            disabled={connectionsSaving}
                        >
                            Cancel
                        </Button>

                        <Button
                            variant="contained"
                            onClick={handleSaveConnection}
                            disabled={connectionsSaving}
                        >
                            {connectionDialogMode === "create"
                                ? "Save connection"
                                : connectionDialogMode === "edit_label"
                                  ? "Save label"
                                  : "Replace key"}
                        </Button>
                    </DialogActions>
                </Dialog>

                <Dialog
                    open={Boolean(connectionDeleteTarget)}
                    onClose={() => {
                        if (!connectionsSaving) {
                            setConnectionDeleteTarget(null);
                        }
                    }}
                    fullWidth
                    maxWidth="xs"
                >
                    <DialogTitle>Delete AssemblyAI connection</DialogTitle>

                    <DialogContent>
                        <Typography variant="body2" color="text.secondary">
                            Remove{" "}
                            <strong>
                                {connectionDeleteTarget?.label ||
                                    "this connection"}
                            </strong>{" "}
                            from your account. This action removes the saved key
                            reference from this app.
                        </Typography>
                    </DialogContent>

                    <DialogActions sx={{ px: 3, pb: 3 }}>
                        <Button
                            onClick={() => setConnectionDeleteTarget(null)}
                            disabled={connectionsSaving}
                        >
                            Cancel
                        </Button>

                        <Button
                            color="error"
                            variant="contained"
                            onClick={handleDeleteConnection}
                            disabled={connectionsSaving}
                        >
                            Delete
                        </Button>
                    </DialogActions>
                </Dialog>

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
        </>
    );
};

export default AccountPage;
