import { useState } from "react";
import {
    IconButton,
    Dialog,
    DialogTitle,
    DialogActions,
    DialogContent,
    DialogContentText,
    Button,
    Tooltip,
    CircularProgress,
    FormGroup,
    FormControlLabel,
    Checkbox,
} from "@mui/material";
import type { SxProps, Theme } from "@mui/material/styles";
import DeleteIcon from "@mui/icons-material/Delete";
import {
    appDialogActionsSx,
    appDialogContentSx,
    appDialogPaperSx,
} from "../../styles/surfaces";

export type DeleteTargets = {
    deleteFromDb: boolean; // always true for now
    deleteFromAssembly: boolean;
    deleteServerFiles: boolean;
};

type Props = {
    onDelete: (targets: DeleteTargets) => Promise<string>;
    label?: string;

    defaultDeleteFromAssembly?: boolean;

    defaultDeleteServerFiles?: boolean;
    iconButtonSx?: SxProps<Theme>;
};

export const DeleteButton = ({
    onDelete,
    label = "Delete",
    defaultDeleteFromAssembly = false,
    defaultDeleteServerFiles = false,
    iconButtonSx,
}: Props) => {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [deleteFromAssembly, setDeleteFromAssembly] = useState(
        defaultDeleteFromAssembly
    );
    const [deleteServerFiles, setDeleteServerFiles] = useState(
        defaultDeleteServerFiles
    );

    const handleConfirm = async () => {
        setLoading(true);
        try {
            await onDelete({
                deleteFromDb: true,
                deleteFromAssembly,
                deleteServerFiles,
            });
        } catch (error) {
            // Parent onDelete should already show any error message (snackbar, etc.)
            // swallow the error to avoid unhandled rejections.
            // eslint-disable-next-line no-console
            console.error("Delete failed:", error);
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
                        sx={iconButtonSx}
                    >
                        {loading ? (
                            <CircularProgress size={24} />
                        ) : (
                            <DeleteIcon />
                        )}
                    </IconButton>
                </span>
            </Tooltip>

            <Dialog
                open={open}
                onClose={() => !loading && setOpen(false)}
                PaperProps={{ sx: appDialogPaperSx }}
            >
                <DialogTitle>Delete transcription</DialogTitle>
                <DialogContent sx={appDialogContentSx}>
                    <DialogContentText sx={{ mb: 2 }}>
                        Choose what you want to delete. The record in the app
                        database will always be removed.
                    </DialogContentText>

                    <FormGroup>
                        <FormControlLabel
                            control={<Checkbox checked disabled />}
                            label="Delete from app database (required)"
                        />
                        <FormControlLabel
                            control={
                                <Checkbox
                                    onChange={(e) =>
                                        setDeleteFromAssembly(e.target.checked)
                                    }
                                />
                            }
                            label="Delete from AssemblyAI (API)"
                        />
                        <FormControlLabel
                            control={
                                <Checkbox
                                    onChange={(e) =>
                                        setDeleteServerFiles(e.target.checked)
                                    }
                                />
                            }
                            label="Delete server-side audio / transcript files"
                        />
                    </FormGroup>
                </DialogContent>
                <DialogActions sx={appDialogActionsSx}>
                    <Button onClick={() => setOpen(false)} disabled={loading}>
                        Cancel
                    </Button>
                    <Button
                        color="error"
                        onClick={handleConfirm}
                        disabled={loading}
                    >
                        {loading ? "Deleting..." : "Delete"}
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};
