import type { ReactNode } from "react";
import type { ThemeOptions } from "@mui/material/styles";

/* -------------------------------------------------------------------------- */
/* Theme Types                                                                */
/* -------------------------------------------------------------------------- */

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

/* -------------------------------------------------------------------------- */
/* Navigation / Sidebar Types                                                 */
/* -------------------------------------------------------------------------- */

export interface SidebarItem {
    text: string;
    icon: React.ReactElement;
    path: string;
}

export interface SubMenuItemProps {
    text: string;
    path: string;
    icon?: ReactNode;
}

export interface SidebarItemProps {
    text: string;
    icon: ReactNode;
    path: string;
    subMenu?: SubMenuItemProps[] | null;
}

export interface SidebarProps {
    isCollapsed: boolean;
    toggleCollapse: () => void;
    menuItems: SidebarItemProps[];
}

/* -------------------------------------------------------------------------- */
/* Auth / User Types                                                          */
/* -------------------------------------------------------------------------- */

export interface User {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
    isconfirmed: boolean;
    created_at: string;
    pending_email?: string | null;
    user_role?: string;
    auth_provider?: "local" | "google";
    google_sub?: string | null;
    has_password?: boolean;
    has_google_auth?: boolean;
}

export type AuthState = {
    user: User | null;
    authReady: boolean;
    setUser: (user: User) => void;
    clearUser: () => void;
    hydrateUser: () => Promise<void>;
};

export interface AuthResponse {
    success: boolean;
    message: string;
    userData: User;
}

export type GoogleReauthIntent =
    | "link"
    | "reauth_email"
    | "reauth_delete"
    | "reauth_unlink"
    | "reauth_assembly_connection";

export type AssemblyAiConnectionStatus = "active" | "invalid";

export interface AssemblyAiConnection {
    id: number;
    provider: "assemblyai";
    label: string;
    masked_key: string;
    key_hint_last4: string;
    is_default: boolean;
    status: AssemblyAiConnectionStatus;
    last_validated_at: string | null;
    created_at: string;
    updated_at: string;
}

export interface CreateAssemblyAiConnectionPayload {
    label: string;
    api_key: string;
    is_default?: boolean;
}

export interface UpdateAssemblyAiConnectionPayload {
    label?: string;
    api_key?: string;
}

export type ThemePreference = "light" | "dark" | "system";
export type SummaryStyle = "concise" | "bullet" | "detailed";
export type SpeechModel = "universal-3-pro" | "universal-2";
export type SpeakerType = "name" | "role";

export type UserPreferences = {
    schemaVersion: number;
    appearance: {
        theme: ThemePreference;
    };
    transcription: {
        model: SpeechModel;
        language: string;
        autoDetectLanguage: boolean;
        codeSwitching: boolean;

        speakerLabels: boolean;
        speakerIdentification: {
            enabled: boolean;
            speakerType: SpeakerType;
            speakers: string[];
        };

        speakersExpected: number;

        formatText: boolean;
        punctuate: boolean;
        disfluencies: boolean;

        prompt: string;

        showSpeakers: boolean;
        showTimestamps: boolean;
    };
    ai: {
        autoSummarizeAfterTranscription: boolean;
        summaryStyle: SummaryStyle;
    };
};

export type DeepPartial<T> = {
    [K in keyof T]?: T[K] extends object
        ? T[K] extends Array<unknown>
            ? T[K]
            : DeepPartial<T[K]>
        : T[K];
};

/* -------------------------------------------------------------------------- */
/* UI / Feature-Specific Types                                                */
/* -------------------------------------------------------------------------- */

export type ProfileDialogProps = {
    open: boolean;
    onClose: () => void;
};

export type SortState = {
    orderBy: "id" | "file_recorded_at" | "file_name" | "status";
    direction: "asc" | "desc";
};

/* -------------------------------------------------------------------------- */
/* Transcription Types                                                        */
/* -------------------------------------------------------------------------- */

export type AssemblyAiConnectionSource =
    | "selected_connection"
    | "default_connection"
    | "app_fallback"
    | "legacy_unknown";

export type TranscriptionConnectionMetadata = {
    assemblyai_connection_id?: number | null;
    assemblyai_connection_label?: string | null;
    assemblyai_connection_source?: AssemblyAiConnectionSource | null;
};

export type TranscriptData = {
    id: string; // local DB ID
    user_id: string;
    transcript_id: string; // AssemblyAI API ID
    file_name: string;
    file_recorded_at: string; // YYYY-MM-DD
    audio_duration: string;
    transcription: string; // plain text
    created_at: string;
    options: TranscriptionOptions;
    utterances?: TranscriptUtterance[] | null;
    words?: NormalizedTranscriptWord[] | null;
    assemblyai_connection_id?: number | null;
    assemblyai_connection_label?: string | null;
    assemblyai_connection_source?: AssemblyAiConnectionSource | null;
};

export type TranscriptUtterance = {
    speaker: string | number | null;
    text: string;
    start: number | null; // ms
    end: number | null; // ms
};

export type NormalizedTranscriptWord = {
    text: string;
    start: number;
    end: number;
    confidence?: number | null;
    speaker?: string | null;
};

export type NormalizedTranscriptTiming = {
    words: NormalizedTranscriptWord[] | null;
    utterances: TranscriptUtterance[] | null;
};

export type SpeakerIdentification = {
    enabled: boolean;
    speaker_type: SpeakerType;
    known_values?: string[];
};

export type TranscriptionOptions = {
    speaker_labels?: boolean;
    speakers_expected?: number;

    speech_models?: SpeechModel[];
    language_code: string;

    language_detection?: boolean;
    language_detection_options?: {
        code_switching?: boolean;
    };

    prompt?: string;

    speaker_identification?: SpeakerIdentification;

    format_text?: boolean;
    punctuate?: boolean;
    disfluencies?: boolean;
};

export type StartTranscriptionJobPayload = {
    file: File;
    options: Partial<TranscriptionOptions>;
    assemblyai_connection_id?: number | null;
    use_app_fallback?: boolean;
};

export type UploadItemStatus =
    | "queued"
    | "uploading"
    | "processing"
    | "completed"
    | "failed";

export type UploadItem = {
    id: string;
    file: File;
    status: UploadItemStatus;
    jobId: string | null;
    stepsState: TranscriptionStepsState;
    result?: TranscriptData;
    error?: string;
};

export type TranscriptionStepKey =
    | "init"
    | "upload"
    | "transcribe"
    | "save_db"
    | "save_file"
    | "complete";

type TranscriptionStepStatus = "pending" | "in_progress" | "success" | "error";

export type TranscriptionStepsState = Record<
    TranscriptionStepKey,
    TranscriptionStepState
>;

export interface TranscriptionStepState {
    status: TranscriptionStepStatus;
    error: string | null;
}

export interface StepEventPayload {
    jobId: string;
    step: TranscriptionStepKey | null;
    status: TranscriptionStepStatus | null;
    error: string | null;
    steps: TranscriptionStepsState;
}

export interface CompletedEventPayload {
    jobId: string;
    steps: TranscriptionStepsState;
    message: string;
    transcriptData: TranscriptData;
}

export interface ErrorEventPayload {
    jobId?: string;
    steps?: TranscriptionStepsState;
    error: string;
    message: string;
}

export interface TranscriptionPayload {
    file: File;
    fileModifiedDate: string; // formatted as YYYY-MM-DD
    options: TranscriptionOptions;
}

export interface transcriptUploadResponse {
    success: boolean;
    message: string;
    transcriptData: TranscriptData;
}

export type Filters = {
    file_name?: string;
    transcript_id?: string;
    date_from?: string;
    date_to?: string;
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
    addTranscription: (t: TranscriptData) => void;
    removeTranscriptionFromList: (id: string) => void;
};

export type OnlineTranscription = TranscriptionConnectionMetadata & {
    transcript_id: string;
    created_at: string;
    status: string;
    project?: string;
    audio_url: string;
    audio_duration?: string;
    speech_model?: string | null;
    speech_models?: string[] | null;
    prompt?: string | null;
    language: string | null;
    features?: string[];
    transcription: string;
    file_name?: string | null;
    file_recorded_at?: string | null;
    utterances?: TranscriptUtterance[] | null;
    words?: NormalizedTranscriptWord[] | null;
};

export type AssemblyTranscriptionState = {
    list: OnlineTranscription[];
    loading: boolean;
    error: string | null;
    searchId: string;
    restoredIds?: string[];
    setList: (data: OnlineTranscription[]) => void;
    setLoading: (loading: boolean) => void;
    setError: (err: string | null) => void;
    setSearchId: (id: string) => void;
    setRestored: (transcriptId: string) => void;
};

export type RestorePayload = {
    transcript_id: string;
    file_name?: string | null;
    audio_duration?: string | number | null;
};
