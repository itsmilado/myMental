//src/components/global/TopBar.tsx

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
import { useColorMode } from "../../theme/theme";
import { logoutUser } from "../../features/auth/api";
import { useAuthStore } from "../../store/useAuthStore";

const TopBar = () => {
    const theme = useTheme();

    const topBarBackground = theme.palette.background.paper;
    const topBarBorder = theme.palette.divider;
    const topBarText = theme.palette.text.primary;
    const avatarBackground = theme.palette.secondary.main;
    const avatarText = theme.palette.secondary.contrastText;
    const navigate = useNavigate();
    const { toggleColorMode } = useColorMode();
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const open: boolean = Boolean(anchorEl);

    const user = useAuthStore((state) => state.user);

    const handleMenuOpen = (event: React.MouseEvent<HTMLElement>): void => {
        setAnchorEl(event.currentTarget);
    };

    const handleMenuClose = (): void => {
        setAnchorEl(null);
    };

    /*
    - purpose: route the top bar theme control through the centralized theme.ts toggle API
    - behavior:
      - preserves the existing icon button UX
      - relies on preferences-backed global theme updates from useColorMode
    */
    const handleThemeToggle = (): void => {
        toggleColorMode();
    };

    const handleLogout = async () => {
        try {
            await logoutUser();
            useAuthStore.getState().clearUser();
            console.log("Logout successful");
        } catch (error) {
            console.error("Logout failed:", error);
        }
        navigate("/");
    };

    return (
        <AppBar
            position="sticky"
            elevation={0}
            sx={{
                backgroundColor: topBarBackground,
                borderBottom: `1px solid ${topBarBorder}`,
                top: 0,
                zIndex: 1300,
            }}
        >
            <Toolbar sx={{ justifyContent: "space-between" }}>
                <Typography
                    variant="h6"
                    fontWeight="bold"
                    sx={{ color: topBarText }}
                >
                    {user?.first_name
                        ? `Welcome, ${user.first_name}!`
                        : "Welcome!"}
                </Typography>

                <Box display="flex" alignItems="center" gap={2}>
                    <IconButton
                        onClick={handleThemeToggle}
                        aria-label="Toggle theme"
                        sx={{
                            color: topBarText,
                            "&:hover": {
                                backgroundColor: theme.palette.action.hover,
                            },
                        }}
                    >
                        {theme.palette.mode === "dark" ? (
                            <LightMode />
                        ) : (
                            <DarkMode />
                        )}
                    </IconButton>

                    <Tooltip title={user?.email ?? "User"}>
                        <Avatar
                            sx={{
                                bgcolor: avatarBackground,
                                color: avatarText,
                                cursor: "pointer",
                            }}
                            onClick={handleMenuOpen}
                        >
                            {user?.first_name?.[0] || "U"}
                        </Avatar>
                    </Tooltip>

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
                        <MenuItem
                            onClick={() => navigate("/dashboard/account")}
                        >
                            Account
                        </MenuItem>

                        <MenuItem
                            onClick={() => navigate("/dashboard/preferences")}
                        >
                            Preferences
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
