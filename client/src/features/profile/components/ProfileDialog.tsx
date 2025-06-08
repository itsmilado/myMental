import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography,
    IconButton,
    Box,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { useAuthStore } from "../../../store/useAuthStore";
import { ProfileDialogProps } from "../../../types/types";

const ProfileDialog = ({ open, onClose }: ProfileDialogProps) => {
    const user = useAuthStore((state) => state.user);

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ m: 0, p: 2 }}>
                Profile
                <IconButton
                    aria-label="Close"
                    onClick={onClose}
                    sx={{ position: "absolute", right: 8, top: 8 }}
                >
                    <CloseIcon />
                </IconButton>
            </DialogTitle>

            <DialogContent dividers>
                {user ? (
                    <Box
                        sx={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 2,
                        }}
                    >
                        <Typography>
                            <strong>Name:</strong> {user.first_name}{" "}
                            {user.last_name}
                        </Typography>
                        <Typography>
                            <strong>Email:</strong> {user.email}
                        </Typography>
                        <Typography>
                            <strong>Joined since:</strong>{" "}
                            {new Date(user.created_at).toLocaleDateString()}
                        </Typography>
                    </Box>
                ) : (
                    <Typography>Loading user data...</Typography>
                )}
            </DialogContent>
            <DialogActions>
                <Button disabled>Edit</Button>
                <Button variant="contained" disabled>
                    Save
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default ProfileDialog;
