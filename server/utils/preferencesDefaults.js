// utils/preferencesDefaults.js

const PREFERENCES_SCHEMA_VERSION = 2;

const DEFAULT_PREFERENCES = {
    schemaVersion: PREFERENCES_SCHEMA_VERSION,

    appearance: {
        theme: "system",
    },

    transcription: {
        model: "universal-3-pro",
        language: "en_us",
        autoDetectLanguage: true,
        codeSwitching: false,

        speakerLabels: false,
        speakerId: false,
        speakerType: "name",
        knownSpeakerValues: "",
        speakersExpected: 2,

        formatText: true,
        punctuate: true,
        disfluencies: false,

        prompt: "",

        showSpeakers: true,
        showTimestamps: false,
    },

    ai: {
        autoSummarizeAfterTranscription: false,
        summaryStyle: "bullets",
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
