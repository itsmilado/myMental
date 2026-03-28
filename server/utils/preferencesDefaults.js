// utils/preferencesDefaults.js

const PREFERENCES_SCHEMA_VERSION = 3;

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
        speakerIdentification: {
            enabled: false,
            speakerType: "name",
            speakers: [],
        },

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
        summaryStyle: "bullet",
    },
};

const normalizeSpeakerIdentification = (transcription = {}) => {
    const next = transcription.speakerIdentification;

    if (next && typeof next === "object") {
        return {
            enabled: Boolean(next.enabled),
            speakerType: next.speakerType === "role" ? "role" : "name",
            speakers: Array.isArray(next.speakers)
                ? next.speakers
                      .map((value) => String(value).trim())
                      .filter(Boolean)
                : [],
        };
    }

    const legacySpeakers =
        typeof transcription.knownSpeakerValues === "string"
            ? transcription.knownSpeakerValues
                  .split(",")
                  .map((value) => value.trim())
                  .filter(Boolean)
            : [];

    return {
        enabled: Boolean(transcription.speakerId),
        speakerType: transcription.speakerType === "role" ? "role" : "name",
        speakers: legacySpeakers,
    };
};

const mergePreferences = (stored = {}) => {
    return {
        ...DEFAULT_PREFERENCES,
        ...stored,
        appearance: {
            ...DEFAULT_PREFERENCES.appearance,
            ...(stored.appearance || {}),
        },
        transcription: {
            ...DEFAULT_PREFERENCES.transcription,
            ...(stored.transcription || {}),
            speakerIdentification: normalizeSpeakerIdentification(
                stored.transcription || {},
            ),
        },
        ai: {
            ...DEFAULT_PREFERENCES.ai,
            ...(stored.ai || {}),
        },
        schemaVersion: DEFAULT_PREFERENCES.schemaVersion,
    };
};

module.exports = {
    DEFAULT_PREFERENCES,
    mergePreferences,
};
