//src/components/global/TopBar.tsx

import { useEffect, useRef, useState } from "react";
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
    useScrollTrigger,
} from "@mui/material";
import { LightMode, DarkMode } from "@mui/icons-material";
import { useColorScheme, useTheme, styled } from "@mui/material/styles";
import { logoutUser } from "../../api/authApi";
import { useAuthStore } from "../../store/useAuthStore";
import { usePreferencesStore } from "../../store/usePreferencesStore";

const FrostedTopBar = styled(AppBar)(({ theme }) => ({
    top: 0,
    zIndex: 1300,
    backgroundColor: "transparent",
    backgroundImage: "none",
    boxShadow: "none",
    borderBottom: `1px solid ${theme.palette.divider}`,
    color: theme.palette.text.primary,
    transition: "background-color 200ms ease, border-color 200ms ease",
    "&.scrolled": {
        backgroundColor: "transparent",
        backdropFilter: "blur(10px)",
        borderBottom: `1px solid ${theme.palette.divider}`,
    },
    ...theme.applyStyles("dark", {
        backgroundColor: "transparent",
        backgroundImage: "none",
        "&.scrolled": {
            backgroundColor: "rgba(11, 17, 32, 0.72)",
            backdropFilter: "blur(10px)",
            borderBottom: `1px solid ${theme.palette.divider}`,
        },
    }),
}));

const TopBar = () => {
    const theme = useTheme();

    const navigate = useNavigate();
    const { mode, systemMode, setMode } = useColorScheme();
    const appBarRef = useRef<HTMLDivElement | null>(null);
    const [scrollTarget, setScrollTarget] = useState<HTMLElement | undefined>();
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const open: boolean = Boolean(anchorEl);

    const user = useAuthStore((state) => state.user);
    const patchPreferences = usePreferencesStore((state) => state.patch);

    useEffect(() => {
        setScrollTarget(appBarRef.current?.parentElement ?? undefined);
    }, []);

    const trigger = useScrollTrigger({
        disableHysteresis: true,
        threshold: 12,
        target: scrollTarget,
    });

    const handleMenuOpen = (event: React.MouseEvent<HTMLElement>): void => {
        setAnchorEl(event.currentTarget);
    };

    const handleMenuClose = (): void => {
        setAnchorEl(null);
    };

    /*
    - purpose: route the top bar theme control through AppTheme and saved preferences
    - behavior:
      - preserves the existing icon button UX
      - keeps optimistic MUI color-scheme switching even if persistence fails
    */
    const handleThemeToggle = (): void => {
        const resolvedMode = systemMode || mode || theme.palette.mode;
        const nextMode = resolvedMode === "dark" ? "light" : "dark";

        setMode(nextMode);
        void patchPreferences({
            appearance: {
                theme: nextMode,
            },
        }).catch((error) => {
            console.error("Failed to save theme preference:", error);
        });
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
        <FrostedTopBar
            ref={appBarRef}
            position="sticky"
            className={trigger ? "scrolled" : ""}
            elevation={0}
        >
            <Toolbar sx={{ justifyContent: "space-between" }}>
                <Typography variant="h6" fontWeight="bold" color="text.primary">
                    {user?.first_name
                        ? `Welcome, ${user.first_name}!`
                        : "Welcome!"}
                </Typography>

                <Box display="flex" alignItems="center" gap={2}>
                    <IconButton
                        onClick={handleThemeToggle}
                        aria-label="Toggle theme"
                        sx={{
                            bgcolor: "none",
                            border: "none",
                            "&:hover": {
                                bgcolor: "action.hover",
                            },
                        }}
                    >
                        {(systemMode || mode || theme.palette.mode) ===
                        "dark" ? (
                            <LightMode />
                        ) : (
                            <DarkMode />
                        )}
                    </IconButton>

                    <Tooltip title={user?.email ?? "User"}>
                        <Avatar
                            sx={{
                                color: "primary.contrastText",
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
        </FrostedTopBar>
    );
};

export default TopBar;
