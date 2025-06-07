// ./src/types.ts
import type { ReactNode } from "react";
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

export interface ColorModeContextValue {
    toggleColorMode: () => void;
}

export interface SidebarItem {
    text: string;
    icon: React.ReactElement;
    path: string;
}

export interface SidebarItemProps {
    text: string;
    icon: ReactNode;
    path: string;
    subMenu?: SubMenuItemProps[] | null;
}

export interface SubMenuItemProps {
    text: string;
    path: string;
    icon?: ReactNode;
}

export interface SidebarProps {
    isCollapsed: boolean;
    toggleCollapse: () => void;
    menuItems: SidebarItemProps[];
}

export interface User {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
    isConfirmed: boolean;
    created_at: string;
}

export interface AuthState {
    user: User | null;
    setUser: (user: User | null) => void;
    clearUser: () => void;
}
