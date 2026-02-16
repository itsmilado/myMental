// src/features/account/pages/AcccountPage.tsx

import { useState } from "react";
import {
    Box,
    Paper,
    Typography,
    Button,
    Stack,
    Divider,
    Snackbar,
    Alert,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../../store/useAuthStore";
import ProfileDialog from "../../profile/components/ProfileDialog";
import ReauthDialog from "../components/ReauthDialog";
import DeleteAccountConfirmDialog from "../components/DeleteAccountConfirmDialog";
import { deleteMyAccount } from "../../auth/api";

const AccountPage = () => {
    const user = useAuthStore((s) => s.user);
    const clearUser = useAuthStore((s) => s.clearUser);
    const navigate = useNavigate();

    const [openProfileDialog, setOpenProfileDialog] = useState(false);

    const [reauthOpen, setReauthOpen] = useState(false);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const [toast, setToast] = useState<{
        open: boolean;
        message: string;
        severity: "success" | "error";
    }>({ open: false, message: "", severity: "success" });

    const startDeleteFlow = () => setReauthOpen(true);

    const handleReauthSuccess = () => {
        setReauthOpen(false);
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
                        <Typography>
                            {user?.first_name} {user?.last_name}
                        </Typography>
                    </Box>

                    <Box>
                        <Typography variant="subtitle2" color="text.secondary">
                            Email
                        </Typography>
                        <Typography>{user?.email}</Typography>
                    </Box>

                    <Divider />

                    <Stack direction="row" spacing={2}>
                        <Button
                            variant="contained"
                            onClick={() => setOpenProfileDialog(true)}
                        >
                            Edit profile
                        </Button>

                        <Button variant="outlined" disabled>
                            Change password (soon)
                        </Button>
                    </Stack>
                </Stack>
            </Paper>

            <Paper
                sx={{
                    p: 3,
                    border: "1px solid",
                    borderColor: "error.light",
                }}
            >
                <Typography variant="h6" fontWeight={700} color="error">
                    Danger Zone
                </Typography>

                <Typography color="text.secondary" sx={{ mt: 1 }}>
                    Permanently delete your account and all associated data.
                </Typography>

                <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
                    <Button
                        variant="contained"
                        color="error"
                        onClick={startDeleteFlow}
                    >
                        Delete account
                    </Button>
                </Stack>
            </Paper>

            <ProfileDialog
                open={openProfileDialog}
                onClose={() => setOpenProfileDialog(false)}
            />

            <ReauthDialog
                open={reauthOpen}
                onClose={() => setReauthOpen(false)}
                onSuccess={handleReauthSuccess}
            />

            <DeleteAccountConfirmDialog
                open={deleteConfirmOpen}
                loading={deleting}
                onClose={() => setDeleteConfirmOpen(false)}
                onConfirm={handleDelete}
            />

            <Snackbar
                open={toast.open}
                autoHideDuration={2500}
                onClose={() => setToast((t) => ({ ...t, open: false }))}
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            >
                <Alert
                    severity={toast.severity}
                    onClose={() => setToast((t) => ({ ...t, open: false }))}
                >
                    {toast.message}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default AccountPage;
