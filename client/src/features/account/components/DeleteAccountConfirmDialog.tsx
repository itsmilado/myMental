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

type Props = {
    open: boolean;
    onClose: () => void;
    onConfirm: () => void;
    loading?: boolean;
};

const DeleteAccountConfirmDialog = ({
    open,
    onClose,
    onConfirm,
    loading = false,
}: Props) => {
    const [value, setValue] = useState("");

    useEffect(() => {
        if (!open) return;
        setValue("");
    }, [open]);

    const canConfirm = value.trim().toUpperCase() === "DELETE";

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
            <DialogTitle sx={{ pr: 6 }}>
                Delete account
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
                    <Alert severity="warning">
                        This permanently deletes your account and all associated
                        data. This action cannot be undone.
                    </Alert>

                    <TextField
                        label='Type "DELETE" to confirm'
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        disabled={loading}
                        fullWidth
                        autoFocus
                    />
                </Stack>
            </DialogContent>

            <DialogActions>
                <Button onClick={onClose} disabled={loading}>
                    Cancel
                </Button>
                <Button
                    variant="contained"
                    color="error"
                    onClick={onConfirm}
                    disabled={!canConfirm || loading}
                >
                    Delete
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default DeleteAccountConfirmDialog;
