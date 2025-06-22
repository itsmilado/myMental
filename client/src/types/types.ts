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

export interface AuthResponse {
    success: boolean;
    message: string;
    userData: User;
}

export type ProfileDialogProps = {
    open: boolean;
    onClose: () => void;
};

export type TranscriptData = {
    id: string; // local DB ID
    user_id: string;
    transcript_id: string; // AssemblyAI API ID
    file_name: string;
    file_recorded_at: string; // YYYY-MM-DD
    transcription: string; // plain text
    created_at: string;
};

export type TranscriptionOptions = {
    speaker_labels: boolean;
    speakers_expected: number;
    sentiment_analysis: boolean;
    speech_model: string;
    language_code: string;
    format_text: boolean;
    entity_detection: boolean;
};

export interface TranscriptionPayload {
    file: File;
    fileModifiedDate: string; // formatted as YYYY-MM-DD
    options: TranscriptionOptions;
}

export interface transcriptUploadResponse {
    success: boolean;
    message: string;
    TranscriptData: TranscriptData;
}

export type Filters = {
    file_name?: string;
    transcript_id?: string;
    date_from?: string;
    date_to?: string;
    // status?: string;
    // model?: string;
    // language?: string;
    // dateRange?: { from: string; to: string };
};

export type SortState = {
    orderBy: "file_recorded_at" | "file_name" | "status";
    direction: "asc" | "desc";
};

export type TranscriptionState = {
    list: TranscriptData[];
    active: TranscriptData | null;
    filters: Filters;
    loading: boolean;
    error: string | null;
    sort: SortState;
    setList: (data: TranscriptData[]) => void;
    setActive: (item: TranscriptData | null) => void;
    setFilters: (filters: Filters) => void;
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
    setSort: (sort: SortState) => void;
    removeTranscriptionFromList: (id: string) => void;
};

export type OnlineTranscription = {
    transcript_id: string;
    created_at: string;
    status: string;
    project?: string;
    audio_url: string;
    audio_duration?: string;
    speech_model: string;
    language: string;
    features?: string[];
};

export type AssemblyTranscriptionState = {
    list: OnlineTranscription[];
    loading: boolean;
    error: string | null;
    searchId: string;
    setList: (data: OnlineTranscription[]) => void;
    setLoading: (loading: boolean) => void;
    setError: (err: string | null) => void;
    setSearchId: (id: string) => void;
};
