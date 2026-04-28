import React from "react";
// @ts-ignore
import "./App.css";
import { Box, CssBaseline } from "@mui/material";
import AppRoutes from "./routes/AppRoutes";
import { ThemeProvider } from "@mui/material";
import { useMode, ColorModeContext } from "./theme/theme";
import { useAuthStore } from "./store/useAuthStore";
import { usePreferencesStore } from "./store/usePreferencesStore";
import { fetchCurrentUser } from "./features/auth/api";
import GlobalLoader from "./components/global/GlobalLoader";

function App() {
    const [theme, colorMode] = useMode();
    const setUser = useAuthStore((state) => state.setUser);
    const clearUser = useAuthStore((state) => state.clearUser);
    const loadPreferences = usePreferencesStore((state) => state.load);
    const preferencesLoading = usePreferencesStore((state) => state.loading);
    const [checkingAuth, setCheckingAuth] = React.useState(true);

    /*
    - purpose: start preferences hydration as early as possible in the active app provider path
    - behavior:
      - keeps theme preference loading near the root app shell
      - reduces visible theme mismatch before route content renders
    */
    React.useEffect(() => {
        void loadPreferences();
    }, [loadPreferences]);

    /*
    - purpose: restore authenticated user state on initial app load
    - behavior:
      - preserves existing session-based auth bootstrap
      - clears stale auth state when restore fails
    */
    React.useEffect(() => {
        let isMounted = true;

        (async () => {
            try {
                const res = await fetchCurrentUser();

                if (!isMounted) {
                    return;
                }

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

    const showAppLoader = checkingAuth || preferencesLoading;

    return (
        <ColorModeContext.Provider value={colorMode}>
            <ThemeProvider theme={theme}>
                <CssBaseline enableColorScheme />
                <Box display="flex">
                    <Box flexGrow={1} p={0}>
                        {showAppLoader ? (
                            <GlobalLoader
                                label="Loading your workspace..."
                                minHeight="100vh"
                            />
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
