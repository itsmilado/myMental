import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    AppBar,
    Avatar,
    Tooltip,
    Box,
    IconButton,
    Toolbar,
    Typography,
    Menu,
    MenuItem,
} from "@mui/material";
import { LightMode, DarkMode } from "@mui/icons-material";
import { useTheme } from "@mui/material/styles";
import { tokens } from "../../theme/theme";
import { useColorMode } from "../../theme/theme";
import { logoutUser } from "../../features/auth/api";
import { useAuthStore } from "../../store/useAuthStore";
import ProfileDialog from "../../features/profile/components/ProfileDialog";

const TopBar = () => {
    const theme = useTheme();
    const colors = tokens(theme.palette.mode);
    const navigate = useNavigate();
    const { toggleColorMode } = useColorMode();
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const open: boolean = Boolean(anchorEl);

    const [openProfileDialog, setOpenProfileDialog] = useState(false);

    const user = useAuthStore((state) => state.user);
    const handleMenuOpen = (event: React.MouseEvent<HTMLElement>): void => {
        setAnchorEl(event.currentTarget);
    };
    const handleMenuClose = (): void => {
        setAnchorEl(null);
    };

    const handleLogout = async () => {
        try {
            await logoutUser();
            useAuthStore.getState().clearUser();
            console.log("Logout successful");
        } catch (error) {
            console.error("Logout failed:", error);
        }
        // localStorage.removeItem("user");
        navigate("/");
    };

    return (
        <AppBar
            position="static"
            elevation={0}
            sx={{
                backgroundColor: colors.primary[400],
                borderBottom: `1px solid ${colors.grey[100]}`,
            }}
        >
            <Toolbar sx={{ justifyContent: "space-between" }}>
                <Typography variant="h6" fontWeight="bold">
                    {user?.first_name
                        ? `Welcome, ${user.first_name}!`
                        : "Welcome!"}
                </Typography>

                <Box display="flex" alignItems="center" gap={2}>
                    <IconButton onClick={toggleColorMode} color="inherit">
                        {theme.palette.mode === "dark" ? (
                            <LightMode />
                        ) : (
                            <DarkMode />
                        )}
                    </IconButton>

                    <Tooltip title={user?.email ?? "User"}>
                        <Avatar
                            sx={{
                                bgcolor: colors.greenAccent[500],
                                cursor: "pointer",
                            }}
                            onClick={handleMenuOpen}
                        >
                            {user?.first_name?.[0] || "U"}
                        </Avatar>
                    </Tooltip>
                    <ProfileDialog
                        open={openProfileDialog}
                        onClose={() => setOpenProfileDialog(false)}
                    />
                    <Menu
                        anchorEl={anchorEl}
                        open={open}
                        onClose={handleMenuClose}
                        onClick={handleMenuClose}
                        transformOrigin={{
                            horizontal: "right",
                            vertical: "top",
                        }}
                        anchorOrigin={{
                            horizontal: "right",
                            vertical: "bottom",
                        }}
                    >
                        <MenuItem onClick={() => setOpenProfileDialog(true)}>
                            My Profile
                        </MenuItem>

                        <MenuItem
                            onClick={() => navigate("/dashboard/settings")}
                        >
                            Settings
                        </MenuItem>
                        <MenuItem
                            onClick={() => {
                                handleLogout();
                                handleMenuClose();
                            }}
                        >
                            Logout
                        </MenuItem>
                    </Menu>
                </Box>
            </Toolbar>
        </AppBar>
    );
};

export default TopBar;
