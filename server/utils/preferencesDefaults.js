const PREFERENCES_SCHEMA_VERSION = 1;

const DEFAULT_PREFERENCES = {
    schemaVersion: PREFERENCES_SCHEMA_VERSION,

    appearance: {
        theme: "system", // "system" | "light" | "dark"
    },

    transcription: {
        defaultLanguageCode: "en_us",
        defaultModel: "slam-1", // adjust to your actual supported models
        defaultSpeakerLabels: false,
        defaultShowSpeakers: true,
        defaultShowTimestamps: false,
    },

    ai: {
        autoSummarizeAfterTranscription: false,
        summaryStyle: "bullets", // "bullets" | "journal" | "action_items"
    },
};

const mergePreferences = (stored) => {
    // stored can be null/undefined/{}; merge shallow+nested safely
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
