//src/features/preferences/utils/mapPreferencesToUploadOptions.ts

import type {
    TranscriptionOptions,
    UserPreferences,
} from "../../../types/types";

const AUTO_LANGUAGE_CODE = "auto";

/**
- Maps selected UI model to AssemblyAI-compatible speech_models array
- Preserves fallback order required by the transcription request
*/
const mapSpeechModels = (
    model?: UserPreferences["transcription"]["model"],
): TranscriptionOptions["speech_models"] => {
    if (model === "universal-3-pro") {
        return ["universal-3-pro", "universal-2"];
    }

    return ["universal-2"];
};

/**
- Normalizes known speaker values from user input
- Removes empty entries before request mapping
*/
const sanitizeKnownValues = (values?: string[]): string[] | undefined => {
    const cleaned = (values ?? []).map((value) => value.trim()).filter(Boolean);
    return cleaned.length > 0 ? cleaned : undefined;
};

/**
- Maps speaker identification preferences to transcription request shape
- Omits identification config when the feature is disabled
*/
const mapSpeakerIdentification = (
    transcription: UserPreferences["transcription"],
): TranscriptionOptions["speaker_identification"] | undefined => {
    if (!transcription.speakerIdentification?.enabled) {
        return undefined;
    }

    return {
        enabled: true,
        speaker_type: transcription.speakerIdentification.speakerType ?? "name",
        known_values: sanitizeKnownValues(
            transcription.speakerIdentification.speakers,
        ),
    };
};

/**
- Transforms stored user preferences into upload-ready transcription options
- Reconciles saved defaults with upload request requirements
*/
export const mapPreferencesToUploadOptions = (
    preferences: UserPreferences,
): TranscriptionOptions => {
    const transcription = preferences.transcription;

    const model = transcription.model ?? "universal-2";
    const autoDetect =
        Boolean(transcription.autoDetectLanguage) ||
        transcription.language === AUTO_LANGUAGE_CODE;
    const codeSwitching = Boolean(transcription.codeSwitching);

    const language =
        transcription.language && transcription.language !== AUTO_LANGUAGE_CODE
            ? transcription.language
            : "en_us";

    const prompt = (transcription.prompt ?? "").trim();
    const speakerIdentification = mapSpeakerIdentification(transcription);

    return {
        // Identification depends on speaker labels in the backend request
        speaker_labels:
            speakerIdentification !== undefined
                ? true
                : Boolean(transcription.speakerLabels),

        speakers_expected: Math.max(
            1,
            Number(transcription.speakersExpected) || 1,
        ),

        speech_models: mapSpeechModels(model),

        language_code: autoDetect ? AUTO_LANGUAGE_CODE : language,
        language_detection: autoDetect ? true : undefined,
        language_detection_options: codeSwitching
            ? { code_switching: true }
            : undefined,

        prompt: model === "universal-3-pro" && prompt ? prompt : undefined,

        speaker_identification: speakerIdentification,

        format_text:
            model === "universal-3-pro"
                ? false
                : Boolean(transcription.formatText),

        punctuate:
            model === "universal-3-pro"
                ? false
                : transcription.punctuate === undefined
                  ? true
                  : Boolean(transcription.punctuate),

        disfluencies: Boolean(transcription.disfluencies),
    };
};
