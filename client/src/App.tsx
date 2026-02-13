import React from "react";
import "./App.css";
import { Box, CircularProgress } from "@mui/material";
import AppRoutes from "./routes/AppRoutes"; // central route config
import { ThemeProvider, CssBaseline, useTheme } from "@mui/material";
import { useMode, ColorModeContext } from "./theme/theme";
import { useAuthStore } from "./store/useAuthStore";
import { fetchCurrentUser } from "./features/auth/api";
// import { theme } from "./theme/theme";

function App() {
    const [theme, colorMode] = useMode();
    const setUser = useAuthStore((state) => state.setUser);
    const clearUser = useAuthStore((state) => state.clearUser);
    const [checkingAuth, setCheckingAuth] = React.useState(true);

    React.useEffect(() => {
        let isMounted = true;

        (async () => {
            try {
                const res = await fetchCurrentUser();
                if (!isMounted) return;

                if (res.success && res.userData) {
                    setUser(res.userData);
                } else {
                    clearUser();
                }
            } catch (error) {
                console.error("Error fetching current user:", error);
                if (isMounted) {
                    clearUser();
                }
            } finally {
                if (isMounted) {
                    setCheckingAuth(false);
                }
            }
        })();

        return () => {
            isMounted = false;
        };
    }, [setUser, clearUser]);

    return (
        <ColorModeContext.Provider value={colorMode}>
            <ThemeProvider theme={theme}>
                <CssBaseline />
                <Box display="flex">
                    <Box flexGrow={1} p={0}>
                        {checkingAuth ? (
                            <Box
                                display="flex"
                                justifyContent="center"
                                alignItems="center"
                                minHeight="100vh"
                            >
                                <CircularProgress />
                            </Box>
                        ) : (
                            <AppRoutes />
                        )}
                    </Box>
                </Box>
            </ThemeProvider>
        </ColorModeContext.Provider>
    );
}

export default App;
