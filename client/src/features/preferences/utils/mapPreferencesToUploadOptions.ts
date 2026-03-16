import type {
    TranscriptionOptions,
    UserPreferences,
} from "../../../types/types";

const AUTO_LANGUAGE_CODE = "auto";

export const mapPreferencesToUploadOptions = (
    preferences: UserPreferences,
): TranscriptionOptions => {
    const transcription = preferences.transcription;
    const isUniversal2 = transcription.model === "universal-2";
    const autoDetect = isUniversal2 && transcription.autoDetectLanguage;
    const codeSwitching = autoDetect && transcription.codeSwitching;

    return {
        speaker_labels: transcription.speakerLabels,
        speakers_expected: Math.max(1, transcription.speakersExpected || 1),
        format_text: transcription.formatText,
        punctuate: transcription.punctuate,
        entity_detection: transcription.entityDetection,
        sentiment_analysis: transcription.sentimentAnalysis,
        speech_models: [transcription.model],
        language_code: autoDetect ? AUTO_LANGUAGE_CODE : transcription.language,
        language_detection: autoDetect,
        language_detection_options: codeSwitching
            ? { code_switching: true }
            : undefined,
    };
};
