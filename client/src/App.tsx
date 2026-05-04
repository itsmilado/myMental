import React from "react";
// @ts-ignore
import "./App.css";
import { Box, CssBaseline } from "@mui/material";
import AppRoutes from "./routes/AppRoutes";
import AppTheme from "./theme/AppTheme";
import { useAuthStore } from "./store/useAuthStore";
import { usePreferencesStore } from "./store/usePreferencesStore";
import { fetchCurrentUser } from "./api/authApi";
import GlobalLoader from "./components/global/GlobalLoader";

function App() {
    const setUser = useAuthStore((state) => state.setUser);
    const clearUser = useAuthStore((state) => state.clearUser);
    const user = useAuthStore((state) => state.user);
    const loadPreferences = usePreferencesStore((state) => state.load);
    const resetPreferences = usePreferencesStore((state) => state.reset);
    const preferencesLoading = usePreferencesStore((state) => state.loading);
    const [checkingAuth, setCheckingAuth] = React.useState(true);
    const userId = user?.id ?? null;

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
                    resetPreferences();
                }
            } catch (error) {
                console.error("Error fetching current user:", error);

                if (isMounted) {
                    clearUser();
                    resetPreferences();
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
    }, [setUser, clearUser, resetPreferences]);

    /*
    - purpose: hydrate preferences only after an authenticated user is known
    - behavior:
      - avoids marking preferences loaded from an unauthenticated request
      - reloads preferences after login when auth state changes
    */
    React.useEffect(() => {
        if (!userId) {
            resetPreferences();
            return;
        }

        void loadPreferences();
    }, [userId, loadPreferences, resetPreferences]);

    const showAppLoader = checkingAuth || preferencesLoading;

    return (
        <AppTheme>
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
        </AppTheme>
    );
}

export default App;
