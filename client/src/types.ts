// ./src/types.ts

import type { ThemeOptions } from "@mui/material/styles";

export type ColorMode = "light" | "dark";

export interface ColorPalette {
    100: string;
    200: string;
    300: string;
    400: string;
    500: string;
    600: string;
    700: string;
    800: string;
    900: string;
}

export interface ColorTokens {
    grey: ColorPalette;
    primary: ColorPalette;
    greenAccent: ColorPalette;
    redAccent: ColorPalette;
    blueAccent: ColorPalette;
}

export interface PaletteOptions {
    main: string;
}

export interface NeutralPalette {
    dark: string;
    main: string;
    light: string;
}

export interface PaletteMode {
    mode: ColorMode;
    primary: PaletteOptions;
    secondary: PaletteOptions;
    neutral: NeutralPalette;
    background: {
        default: string;
    };
}

export interface TypographyVariant {
    fontFamily: string;
    fontSize: number;
}

export interface TypographyOptions {
    fontFamily: string;
    fontSize: number;
    h1: TypographyVariant;
    h2: TypographyVariant;
    h3: TypographyVariant;
    h4: TypographyVariant;
    h5: TypographyVariant;
    h6: TypographyVariant;
}

export type ThemeSettings = ThemeOptions;
// export const themeSettings = (mode: ColorMode): ThemeOptions => {
//     palette: {
//         mode: mode,
//         PaletteMode;
//     typography: TypographyOptions;
// };

export interface ColorModeContextValue {
    toggleColorMode: () => void;
}

export interface SidebarItem {
    text: string;
    icon: React.ReactElement;
    path: string;
}
