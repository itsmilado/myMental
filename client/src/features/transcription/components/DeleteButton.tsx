import { useState } from "react";
import {
    IconButton,
    Dialog,
    DialogTitle,
    DialogActions,
    Button,
    Tooltip,
    CircularProgress,
    Snackbar,
    Alert,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";

type Props = {
    onDelete: () => Promise<string>; // called on confirm
    label?: string;
    onSuccess?: (message: string) => void;
};

export const DeleteButton = ({ onDelete, label = "Delete" }: Props) => {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [snackbar, setSnackbar] = useState<{
        open: boolean;
        message: string;
        error?: boolean;
    }>({ open: false, message: "" });

    const handleConfirm = async () => {
        setLoading(true);
        try {
            const message = await onDelete();
            setSnackbar({ open: true, message: message });
        } catch (error: any) {
            setSnackbar({
                open: true,
                message: error.message || "Delete failed",
                error: true,
            });
        } finally {
            setLoading(false);
            setOpen(false);
        }
    };

    return (
        <>
            <Tooltip title={label}>
                <span>
                    <IconButton
                        onClick={() => setOpen(true)}
                        disabled={loading}
                    >
                        {loading ? (
                            <CircularProgress size={24} />
                        ) : (
                            <DeleteIcon />
                        )}
                    </IconButton>
                </span>
            </Tooltip>
            <Dialog open={open} onClose={() => setOpen(false)}>
                <DialogTitle>
                    Are you sure you want to delete this transcription?
                </DialogTitle>
                <DialogActions>
                    <Button onClick={() => setOpen(false)} disabled={loading}>
                        Cancel
                    </Button>
                    <Button
                        color="error"
                        onClick={handleConfirm}
                        disabled={loading}
                    >
                        Delete
                    </Button>
                </DialogActions>
            </Dialog>
            <Snackbar
                open={snackbar.open}
                autoHideDuration={2500}
                onClose={() => setSnackbar({ ...snackbar, open: false })}
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            >
                <Alert
                    onClose={() => setSnackbar({ ...snackbar, open: false })}
                    severity={snackbar.error ? "error" : "success"}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </>
    );
};
