// utils/preferencesDefaults.js

const PREFERENCES_SCHEMA_VERSION = 2;

const DEFAULT_PREFERENCES = {
    schemaVersion: PREFERENCES_SCHEMA_VERSION,

    appearance: {
        theme: "system", // "system" | "light" | "dark"
    },

    transcription: {
        model: "slam-1",
        language: "en_us",
        autoDetectLanguage: false,
        codeSwitching: false,
        speakerLabels: false,
        speakersExpected: 2,
        formatText: true,
        punctuate: true,
        entityDetection: false,
        sentimentAnalysis: false,
        showSpeakers: true,
        showTimestamps: false,
    },

    ai: {
        autoSummarizeAfterTranscription: false,
        summaryStyle: "bullets", // "bullets" | "journal" | "action_items"
    },
};

const mergePreferences = (stored) => {
    const s = stored && typeof stored === "object" ? stored : {};

    return {
        ...DEFAULT_PREFERENCES,
        ...s,
        appearance: {
            ...DEFAULT_PREFERENCES.appearance,
            ...(s.appearance || {}),
        },
        transcription: {
            ...DEFAULT_PREFERENCES.transcription,
            ...(s.transcription || {}),
        },
        ai: {
            ...DEFAULT_PREFERENCES.ai,
            ...(s.ai || {}),
        },
        schemaVersion: DEFAULT_PREFERENCES.schemaVersion,
    };
};

module.exports = {
    DEFAULT_PREFERENCES,
    mergePreferences,
};
