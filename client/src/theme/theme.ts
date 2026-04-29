import { useContext, useEffect, useMemo, useState } from "react";
import { createTheme } from "@mui/material/styles";
import { createContext } from "react";
import type {
    ColorMode,
    ColorModeContextValue,
    ColorTokens,
    ThemeSettings,
    ThemePreference,
} from "../types/types";
import { usePreferencesStore } from "../store/usePreferencesStore";

export const tokens = (mode: ColorMode): ColorTokens => ({
    ...(mode === "dark"
        ? {
              grey: {
                  100: "#e0e0e0",
                  200: "#c2c2c2",
                  300: "#a3a3a3",
                  400: "#858585",
                  500: "#666666",
                  600: "#525252",
                  700: "#3d3d3d",
                  800: "#292929",
                  900: "#141414",
              },
              primary: {
                  100: "#d0d1d5",
                  200: "#a1a4ab",
                  300: "#727681",
                  400: "#1F2A40",
                  500: "#141b2d",
                  600: "#101624",
                  700: "#0c101b",
                  800: "#090d13",
                  900: "#050708",
              },
              greenAccent: {
                  100: "#dbf5ee",
                  200: "#b7ebde",
                  300: "#94e2cd",
                  400: "#70d8bd",
                  500: "#4cceac",
                  600: "#3da58a",
                  700: "#2e7c67",
                  800: "#1e5245",
                  900: "#0f2922",
              },
              redAccent: {
                  100: "#f8dcdb",
                  200: "#f1b9b7",
                  300: "#e99592",
                  400: "#e2726e",
                  500: "#db4f4a",
                  600: "#af3f3b",
                  700: "#832f2c",
                  800: "#58201e",
                  900: "#2c100f",
              },
              blueAccent: {
                  100: "#e1e2fe",
                  200: "#c3c6fd",
                  300: "#a4a9fc",
                  400: "#868dfb",
                  500: "#6870fa",
                  600: "#535ac8",
                  700: "#3e4396",
                  800: "#2a2d64",
                  900: "#151632",
              },
          }
        : {
              grey: {
                  100: "#141414",
                  200: "#292929",
                  300: "#3d3d3d",
                  400: "#525252",
                  500: "#666666",
                  600: "#858585",
                  700: "#a3a3a3",
                  800: "#c2c2c2",
                  900: "#e0e0e0",
              },
              primary: {
                  100: "#040509",
                  200: "#080b12",
                  300: "#0c101b",
                  400: "#f2f0f0",
                  500: "#141b2d",
                  600: "#434957",
                  700: "#727681",
                  800: "#a1a4ab",
                  900: "#d0d1d5",
              },
              greenAccent: {
                  100: "#0f2922",
                  200: "#1e5245",
                  300: "#2e7c67",
                  400: "#3da58a",
                  500: "#4cceac",
                  600: "#70d8bd",
                  700: "#94e2cd",
                  800: "#b7ebde",
                  900: "#dbf5ee",
              },
              redAccent: {
                  100: "#2c100f",
                  200: "#58201e",
                  300: "#832f2c",
                  400: "#af3f3b",
                  500: "#db4f4a",
                  600: "#e2726e",
                  700: "#e99592",
                  800: "#f1b9b7",
                  900: "#f8dcdb",
              },
              blueAccent: {
                  100: "#151632",
                  200: "#2a2d64",
                  300: "#3e4396",
                  400: "#535ac8",
                  500: "#6870fa",
                  600: "#868dfb",
                  700: "#a4a9fc",
                  800: "#c3c6fd",
                  900: "#e1e2fe",
              },
          }),
});

// mui theme settings
export const themeSettings = (mode: ColorMode): ThemeSettings => {
    const colors = tokens(mode);

    return {
        palette: {
            mode,
            ...(mode === "dark"
                ? {
                      primary: {
                          main: colors.blueAccent[500],
                          light: colors.blueAccent[400],
                          dark: colors.blueAccent[700],
                          contrastText: colors.grey[100],
                      },
                      secondary: {
                          main: colors.greenAccent[500],
                          light: colors.greenAccent[400],
                          dark: colors.greenAccent[700],
                          contrastText: colors.grey[900],
                      },
                      neutral: {
                          dark: colors.grey[700],
                          main: colors.grey[500],
                          light: colors.grey[100],
                      },
                      background: {
                          default: colors.primary[500],
                          paper: colors.primary[400],
                      },
                      text: {
                          primary: colors.grey[100],
                          secondary: colors.grey[300],
                      },
                      divider: colors.primary[300],
                      action: {
                          hover: "rgba(255, 255, 255, 0.08)",
                          selected: "rgba(255, 255, 255, 0.12)",
                          disabled: colors.grey[600],
                          disabledBackground: colors.primary[600],
                      },
                  }
                : {
                      primary: {
                          main: colors.primary[600],
                          light: colors.primary[700],
                          dark: colors.primary[500],
                          contrastText: colors.grey[900],
                      },
                      secondary: {
                          main: colors.greenAccent[500],
                          light: colors.greenAccent[400],
                          dark: colors.greenAccent[700],
                          contrastText: colors.grey[100],
                      },
                      neutral: {
                          dark: colors.grey[300],
                          main: colors.grey[500],
                          light: colors.grey[800],
                      },
                      background: {
                          default: "#eff3fa",
                          paper: "#f8f7f7",
                      },
                      text: {
                          primary: "#172033",
                          secondary: "#5f6b7a",
                      },
                      divider: "#d8dee8",
                      action: {
                          hover: "#eef2f7",
                          selected: "#e4eaf2",
                          disabled: "#9aa6b2",
                          disabledBackground: "#edf1f5",
                      },
                  }),
        },
        typography: {
            fontFamily: ["Source Sans 3", "sans-serif"].join(","),
            fontSize: 12,
            h1: {
                fontFamily: ["Source Sans 3", "sans-serif"].join(","),
                fontSize: 40,
            },
            h2: {
                fontFamily: ["Source Sans 3", "sans-serif"].join(","),
                fontSize: 32,
            },
            h3: {
                fontFamily: ["Source Sans 3", "sans-serif"].join(","),
                fontSize: 24,
            },
            h4: {
                fontFamily: ["Source Sans 3", "sans-serif"].join(","),
                fontSize: 20,
            },
            h5: {
                fontFamily: ["Source Sans 3", "sans-serif"].join(","),
                fontSize: 16,
            },
            h6: {
                fontFamily: ["Source Sans 3", "sans-serif"].join(","),
                fontSize: 14,
            },
        },
    };
};

export const ColorModeContext = createContext<ColorModeContextValue>({
    toggleColorMode: () => {},
});

const getSystemMode = (): ColorMode => {
    if (
        typeof window !== "undefined" &&
        typeof window.matchMedia === "function"
    ) {
        return window.matchMedia("(prefers-color-scheme: dark)").matches
            ? "dark"
            : "light";
    }

    return "dark";
};

const resolveThemeMode = (
    storedPreference: ThemePreference | null | undefined,
): ColorMode => {
    if (storedPreference === "light" || storedPreference === "dark") {
        return storedPreference;
    }

    return getSystemMode();
};

export const useMode = (): [
    ReturnType<typeof createTheme>,
    ColorModeContextValue,
] => {
    const preferences = usePreferencesStore((state) => state.preferences);
    const loadPreferences = usePreferencesStore((state) => state.load);
    const patchPreferences = usePreferencesStore((state) => state.patch);

    const [systemMode, setSystemMode] = useState<ColorMode>(() =>
        getSystemMode(),
    );

    /*
    - purpose: hydrate preferences for the active theme provider on app startup
    - behavior:
      - ensures stored theme preference is available before downstream theme use
      - keeps theme.ts as the single active runtime theme source
    */
    useEffect(() => {
        void loadPreferences();
    }, [loadPreferences]);

    /*
    - purpose: track OS color scheme changes while the user is on system mode
    - behavior:
      - updates instantly when the operating system theme changes
      - safely no-ops in environments without matchMedia support
    */
    useEffect(() => {
        if (
            typeof window === "undefined" ||
            typeof window.matchMedia !== "function"
        ) {
            return;
        }

        const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

        const handleChange = (event: MediaQueryListEvent) => {
            setSystemMode(event.matches ? "dark" : "light");
        };

        setSystemMode(mediaQuery.matches ? "dark" : "light");

        mediaQuery.addEventListener("change", handleChange);

        return () => {
            mediaQuery.removeEventListener("change", handleChange);
        };
    }, []);

    const resolvedMode = useMemo<ColorMode>(() => {
        const preference = preferences?.appearance?.theme;

        if (preference === "system") {
            return systemMode;
        }

        return resolveThemeMode(preference);
    }, [preferences?.appearance?.theme, systemMode]);

    const colorMode = useMemo<ColorModeContextValue>(
        () => ({
            /*
            - purpose: preserve the existing topbar toggle API while writing through preferences
            - behavior:
              - converts system mode into a concrete light/dark toggle target
              - updates global preferences so theme changes persist and propagate instantly
            */
            toggleColorMode: () => {
                const nextMode: ColorMode =
                    resolvedMode === "light" ? "dark" : "light";

                void patchPreferences({
                    appearance: {
                        theme: nextMode,
                    },
                });
            },
        }),
        [patchPreferences, resolvedMode],
    );

    const theme = useMemo(
        () => createTheme(themeSettings(resolvedMode)),
        [resolvedMode],
    );

    return [theme, colorMode];
};

export const useColorMode = () => useContext(ColorModeContext);
