//src/features/preferences/utils/mapPreferencesToUploadOptions.ts

import type {
    TranscriptionOptions,
    UserPreferences,
} from "../../../types/types";

const AUTO_LANGUAGE_CODE = "auto";

/**
 * Maps selected UI model to AssemblyAI-compatible speech_models array.
 *
 * Behavior:
 * - universal-3-pro requires fallback to universal-2
 * - universal-2 uses single model
 *
 * Notes:
 * - This ensures compatibility with AssemblyAI model resolution logic
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
 * Sanitizes speaker list input from UI.
 *
 * Behavior:
 * - Trims whitespace
 * - Removes empty values
 * - Returns undefined if list is empty (prevents sending empty arrays to API)
 *
 * Notes:
 * - Avoids invalid payload structure for speaker_identification
 */
const sanitizeSpeakerList = (values?: string[]): string[] | undefined => {
    const cleaned = (values ?? []).map((value) => value.trim()).filter(Boolean);
    return cleaned.length > 0 ? cleaned : undefined;
};

/**
 * Maps UI speaker identification preferences to API-compatible structure.
 *
 * Behavior:
 * - Returns undefined if feature is disabled
 * - Normalizes speaker_type and speaker list
 *
 * Dependencies:
 * - sanitizeSpeakerList (ensures clean payload)
 *
 * Notes:
 * - This maps to AssemblyAI Speech Understanding feature
 * - Must remain mutually exclusive with speaker_labels
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
        speakers: sanitizeSpeakerList(
            transcription.speakerIdentification.speakers,
        ),
    };
};

/**
 * Transforms user preferences into transcription request payload.
 *
 * ---
 * Behavior:
 * - Converts UI preferences → backend API request shape
 * - Applies model-specific logic (universal-2 vs universal-3-pro)
 * - Normalizes language detection and formatting options
 *
 * ---
 * Dependencies:
 * - mapSpeechModels
 * - mapSpeakerIdentification
 *
 * ---
 * Usage:
 * - Used by UploadAudioPage to construct transcription request
 *
 * ---
 * Notes:
 * - Ensures API payload reflects actual supported AssemblyAI schema
 * - Avoids sending unsupported or empty fields
 * - Maintains separation between UI state and API contract
 */
export const mapPreferencesToUploadOptions = (
    preferences: UserPreferences,
): TranscriptionOptions => {
    const transcription = preferences.transcription;

    const model = transcription.model ?? "universal-2";

    // Model-specific flags
    const isUniversal2 = model === "universal-2";
    const isUniversal3Pro = model === "universal-3-pro";

    // Language detection rules
    // universal-3-pro always uses auto-detection
    const autoDetect =
        isUniversal3Pro ||
        (isUniversal2 && Boolean(transcription.autoDetectLanguage));

    // Code switching only valid for universal-2 with auto-detection enabled
    const codeSwitching =
        isUniversal2 && autoDetect && Boolean(transcription.codeSwitching);

    // Normalize language (fallback to en_us if not explicitly set)
    const language =
        transcription.language && transcription.language !== AUTO_LANGUAGE_CODE
            ? transcription.language
            : "en_us";

    // Clean prompt input (avoid sending empty string)
    const prompt = (transcription.prompt ?? "").trim();

    const speakerIdentification = mapSpeakerIdentification(transcription);

    // Enforce exclusivity: cannot use speaker_labels with identification
    const speakerLabels = speakerIdentification
        ? false
        : Boolean(transcription.speakerLabels);

    return {
        speaker_labels: speakerLabels,

        // Ensure at least 1 speaker (API requirement)
        speakers_expected: Math.max(
            1,
            Number(transcription.speakersExpected) || 1,
        ),

        speech_models: mapSpeechModels(model),

        language_code: autoDetect ? AUTO_LANGUAGE_CODE : language,

        // Only include detection flags when needed (avoid noisy payload)
        language_detection: autoDetect || undefined,
        language_detection_options: codeSwitching
            ? { code_switching: true }
            : undefined,

        // Only include prompt if non-empty
        prompt: prompt || undefined,

        speaker_identification: speakerIdentification,

        // Formatting options
        format_text: Boolean(transcription.formatText),

        // Default to true if undefined (API default expectation)
        punctuate:
            transcription.punctuate === undefined
                ? true
                : Boolean(transcription.punctuate),

        disfluencies: Boolean(transcription.disfluencies),
    };
};
