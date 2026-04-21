//src/types/types.ts

import type { ReactNode } from "react";
import type { ThemeOptions } from "@mui/material/styles";

/* Theme System Types */

/*
- purpose: supported app color modes
- used in: theme-related files in the client theme system
*/
export type ColorMode = "light" | "dark";

/*
- purpose: numeric color scale used by the theme token system
- used in: theme-related files in the client theme system
*/
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

/*
- purpose: grouped color tokens used to build the app theme
- used in: theme-related files in the client theme system
*/
export interface ColorTokens {
    grey: ColorPalette;
    primary: ColorPalette;
    greenAccent: ColorPalette;
    redAccent: ColorPalette;
    blueAccent: ColorPalette;
}

/*
- purpose: simplified palette option shape used by custom theme helpers
- used in: theme-related files in the client theme system
*/
export interface PaletteOptions {
    main: string;
}

/*
- purpose: neutral palette group used by custom theme helpers
- used in: theme-related files in the client theme system
*/
export interface NeutralPalette {
    dark: string;
    main: string;
    light: string;
}

/*
- purpose: app-specific palette mode structure
- used in: theme-related files in the client theme system
*/
export interface PaletteMode {
    mode: ColorMode;
    primary: PaletteOptions;
    secondary: PaletteOptions;
    neutral: NeutralPalette;
    background: {
        default: string;
    };
}

/*
- purpose: typography variant shape used by theme helpers
- used in: theme-related files in the client theme system
*/
export interface TypographyVariant {
    fontFamily: string;
    fontSize: number;
}

/*
- purpose: typography settings shape used by theme helpers
- used in: theme-related files in the client theme system
*/
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

/*
- purpose: alias for MUI theme options used by local theme builders
- used in: theme-related files in the client theme system
*/
export type ThemeSettings = ThemeOptions;

/*
- purpose: context shape for toggling the global color mode
- used in: theme-related files in the client theme system
*/
export interface ColorModeContextValue {
    toggleColorMode: () => void;
}

/* Navigation and Layout Types */

/*
- purpose: basic sidebar item shape for simple route entries
- used in: sidebar/navigation components
*/
export interface SidebarItem {
    text: string;
    icon: React.ReactElement;
    path: string;
}

/*
- purpose: submenu item shape for nested sidebar links
- used in: sidebar/navigation components
*/
export interface SubMenuItemProps {
    text: string;
    path: string;
    icon?: ReactNode;
}

/*
- purpose: full sidebar item shape with optional submenu children
- used in: sidebar/navigation components
*/
export interface SidebarItemProps {
    text: string;
    icon: ReactNode;
    path: string;
    subMenu?: SubMenuItemProps[] | null;
}

/*
- purpose: sidebar component props
- used in: sidebar/navigation components
*/
export interface SidebarProps {
    isCollapsed: boolean;
    toggleCollapse: () => void;
    menuItems: SidebarItemProps[];
}

/* Auth and Account Types */

/*
- purpose: authenticated user shape returned by auth/account endpoints
- used in:
  - imported by src/features/auth/api.ts
*/
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

/*
- purpose: auth store state contract
- used in: auth store files
*/
export type AuthState = {
    user: User | null;
    authReady: boolean;
    setUser: (user: User) => void;
    clearUser: () => void;
    hydrateUser: () => Promise<void>;
};

/*
- purpose: standard auth endpoint response shape
- used in:
  - imported by src/features/auth/api.ts
  - returned by login and session-related auth API functions
*/
export interface AuthResponse {
    success: boolean;
    message: string;
    userData: User;
}

/*
- purpose: allowed Google OAuth intent values
- used in:
  - imported by src/features/auth/api.ts
  - used by startGoogleOAuth()
*/
export type GoogleReauthIntent =
    | "link"
    | "reauth_email"
    | "reauth_delete"
    | "reauth_unlink"
    | "reauth_assembly_connection";

/*
- purpose: validation state for stored AssemblyAI connections
- used in:
  - imported by src/features/auth/api.ts
*/
export type AssemblyAiConnectionStatus = "active" | "invalid";

/*
- purpose: stored AssemblyAI connection row returned to the client
- used in:
  - imported by src/features/auth/api.ts
  - imported by src/features/transcription/pages/UploadAudioPage.tsx
*/
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

/*
- purpose: payload for creating a new AssemblyAI connection
- used in:
  - imported by src/features/auth/api.ts
*/
export interface CreateAssemblyAiConnectionPayload {
    label: string;
    api_key: string;
    is_default?: boolean;
}

/*
- purpose: payload for updating an existing AssemblyAI connection
- used in:
  - imported by src/features/auth/api.ts
*/
export interface UpdateAssemblyAiConnectionPayload {
    label?: string;
    api_key?: string;
}

/* Preferences and Shared Utility Types */

/*
- purpose: supported appearance theme preference values
- used in: user preferences typing
*/
export type ThemePreference = "light" | "dark" | "system";

/*
- purpose: supported AI summary style preference values
- used in: user preferences typing
*/
export type SummaryStyle = "concise" | "bullet" | "detailed";

/*
- purpose: supported transcription speech models
- used in:
  - imported by src/features/transcription/pages/UploadAudioPage.tsx
  - used inside transcription option and preference types
*/
export type SpeechModel = "universal-3-pro" | "universal-2";

/*
- purpose: supported speaker identification modes
- used in:
  - imported by src/features/transcription/pages/UploadAudioPage.tsx
  - used inside transcription option and preference types
*/
export type SpeakerType = "name" | "role";

/*
- purpose: persisted user preferences shape shared across preferences and upload defaults
- used in: preferences and upload preference mapping flows
*/
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

/*
- purpose: recursive partial helper for nested update payloads
- used in: preference update typing and shared utility typing
*/
export type DeepPartial<T> = {
    [K in keyof T]?: T[K] extends object
        ? T[K] extends Array<unknown>
            ? T[K]
            : DeepPartial<T[K]>
        : T[K];
};

/* Shared UI State Types */

/*
- purpose: shared dialog open/close prop shape for profile/account dialogs
- used in: profile/account UI components
*/
export type ProfileDialogProps = {
    open: boolean;
    onClose: () => void;
};

/*
- purpose: offline history sort state shared between store and API requests
- used in:
  - imported by src/features/auth/api.ts
  - used by src/store/useTranscriptionStore.ts
  - used by src/features/transcription/components/TranscriptionTable.tsx
*/
export type SortState = {
    orderBy: "id" | "file_recorded_at" | "file_name" | "status";
    direction: "asc" | "desc";
};

/* Transcription Domain - Shared Metadata */

/*
- purpose: source label for the AssemblyAI connection used by a transcript
- used in: transcription history and connection metadata typing
*/
export type AssemblyAiConnectionSource =
    | "selected_connection"
    | "default_connection"
    | "app_fallback"
    | "legacy_unknown";

/*
- purpose: shared connection metadata attached to offline and online transcript rows
- used in:
  - TranscriptData
  - OnlineTranscription
*/
export type TranscriptionConnectionMetadata = {
    assemblyai_connection_id?: number | null;
    assemblyai_connection_label?: string | null;
    assemblyai_connection_source?: AssemblyAiConnectionSource | null;
};

/* Transcription Domain - Content and Timing Types */

/*
- purpose: normalized utterance block used by transcript rendering and playback sync
- used in:
  - TranscriptData
  - OnlineTranscription
*/
export type TranscriptUtterance = {
    speaker: string | number | null;
    text: string;
    start: number | null;
    end: number | null;
};

/*
- purpose: normalized word timing shape used by playback highlighting
- used in:
  - TranscriptData
  - OnlineTranscription
*/
export type NormalizedTranscriptWord = {
    text: string;
    start: number;
    end: number;
    confidence?: number | null;
    speaker?: string | null;
};

/*
- purpose: grouped timing payload for transcript rendering helpers
- used in: transcription rendering and timing helper flows
*/
export type NormalizedTranscriptTiming = {
    words: NormalizedTranscriptWord[] | null;
    utterances: TranscriptUtterance[] | null;
};

/* Transcription Domain - Request and Option Types */

/*
- purpose: speaker identification option shape sent with transcription requests
- used in:
  - TranscriptionOptions
*/
export type SpeakerIdentification = {
    enabled: boolean;
    speaker_type: SpeakerType;
    known_values?: string[];
};

/*
- purpose: client-side transcription options shape shared across upload, API, and stored metadata
- used in:
  - imported by src/features/transcription/pages/UploadAudioPage.tsx
  - imported by src/features/auth/api.ts through payload types
*/
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

/*
- purpose: payload for starting one background transcription job
- used in:
  - imported by src/features/auth/api.ts
  - consumed by startTranscriptionJob()
*/
export type StartTranscriptionJobPayload = {
    file: File;
    options: Partial<TranscriptionOptions>;
    category?: string | null;
    assemblyai_connection_id?: number | null;
    use_app_fallback?: boolean;
};

/*
- purpose: generic client-side transcription upload payload shape
- used in: shared upload typing
*/
export interface TranscriptionPayload {
    file: File;
    fileModifiedDate: string;
    options: TranscriptionOptions;
    category?: string | null;
}

/*
- purpose: upload completion response shape containing the created offline transcript row
- used in: shared upload response typing
*/
export interface transcriptUploadResponse {
    success: boolean;
    message: string;
    transcriptData: TranscriptData;
}

/* Transcription Domain - Upload Queue and SSE Types */

/*
- purpose: lifecycle states for an upload queue item on UploadAudioPage
- used in:
  - imported by src/features/transcription/pages/UploadAudioPage.tsx
*/
export type UploadItemStatus =
    | "queued"
    | "uploading"
    | "processing"
    | "completed"
    | "failed";

/*
- purpose: one queued upload item tracked by UploadAudioPage
- used in:
  - imported by src/features/transcription/pages/UploadAudioPage.tsx
*/
export type UploadItem = {
    id: string;
    file: File;
    status: UploadItemStatus;
    jobId: string | null;
    stepsState: TranscriptionStepsState;
    result?: TranscriptData;
    error?: string;
};

/*
- purpose: backend SSE transcription step keys
- used in:
  - imported by src/features/transcription/pages/UploadAudioPage.tsx
*/
export type TranscriptionStepKey =
    | "init"
    | "upload"
    | "transcribe"
    | "save_db"
    | "complete";

/*
- purpose: allowed status values for a single transcription step
- used in: SSE step payload typing
*/
type TranscriptionStepStatus = "pending" | "in_progress" | "success" | "error";

/*
- purpose: client-side map of all SSE step states for one job
- used in:
  - imported by src/features/transcription/pages/UploadAudioPage.tsx
*/
export type TranscriptionStepsState = Record<
    TranscriptionStepKey,
    TranscriptionStepState
>;

/*
- purpose: state shape for one backend-reported transcription step
- used in: SSE event payload typing
*/
export interface TranscriptionStepState {
    status: TranscriptionStepStatus;
    error: string | null;
}

/*
- purpose: SSE step event payload received during transcription progress updates
- used in:
  - imported by src/features/transcription/pages/UploadAudioPage.tsx
*/
export interface StepEventPayload {
    jobId: string;
    step: TranscriptionStepKey | null;
    status: TranscriptionStepStatus | null;
    error: string | null;
    steps: TranscriptionStepsState;
}

/*
- purpose: SSE completion payload received when a transcription job finishes
- used in:
  - imported by src/features/transcription/pages/UploadAudioPage.tsx
*/
export interface CompletedEventPayload {
    jobId: string;
    steps: TranscriptionStepsState;
    message: string;
    transcriptData: TranscriptData;
}

/*
- purpose: SSE error payload received when a transcription job fails
- used in:
  - imported by src/features/transcription/pages/UploadAudioPage.tsx
*/
export interface ErrorEventPayload {
    jobId?: string;
    steps?: TranscriptionStepsState;
    error: string;
    message: string;
}

/* Transcription Domain - History, Table, and Store Types */

/*
- purpose: offline transcription row shape returned from the app database
- used in:
  - imported by src/features/auth/api.ts
  - imported by src/store/useTranscriptionStore.ts
  - imported by src/features/transcription/components/TranscriptionTable.tsx
*/
export interface TranscriptData extends TranscriptionConnectionMetadata {
    id: number;
    user_id: number;
    file_name: string;
    audio_duration: number | null;
    transcript_id: string;
    transcription: string;
    options: Partial<TranscriptionOptions>;
    category?: string | null;
    file_recorded_at: string | null;
    created_at: string;
    utterances?: TranscriptUtterance[] | null;
    words?: NormalizedTranscriptWord[] | null;
}

/*
- purpose: supported offline history filters sent from the client to the backend
- used in:
  - imported by src/features/auth/api.ts
  - used by src/store/useTranscriptionStore.ts
*/
export type Filters = {
    file_name?: string;
    transcript_id?: string;
    category?: string;
    date_from?: string;
    date_to?: string;
};

/*
- purpose: Zustand contract for offline transcription history state
- used in:
  - imported by src/store/useTranscriptionStore.ts
*/
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
    removeTranscriptionFromList: (id: number) => void;
};

/*
- purpose: online AssemblyAI history row shape shown in the AssemblyAI history table
- used in:
  - imported by src/features/auth/api.ts
*/
export type OnlineTranscription = TranscriptionConnectionMetadata & {
    transcript_id: string;
    created_at: string;
    status: string;
    project?: string;
    category?: string | null;
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

/*
- purpose: Zustand contract for AssemblyAI history state
- used in: AssemblyAI history store files
*/
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

/*
- purpose: payload used to restore an online transcript back into offline history
- used in:
  - imported by src/features/auth/api.ts
*/
export type RestorePayload = {
    transcript_id: string;
    file_name?: string | null;
    category?: string | null;
    audio_duration?: string | number | null;
};
