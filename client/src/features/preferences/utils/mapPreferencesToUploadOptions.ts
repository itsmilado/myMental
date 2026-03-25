//src/features/preferences/utils/mapPreferencesToUploadOptions.ts

import type {
    SpeakerType,
    TranscriptionOptions,
    UserPreferences,
} from "../../../types/types";

const AUTO_LANGUAGE_CODE = "auto";

const parseKnownSpeakerValues = (rawValue: string): string[] | undefined => {
    const values = rawValue
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);

    return values.length > 0 ? values : undefined;
};

const mapSpeechModels = (
    model: UserPreferences["transcription"]["model"],
): TranscriptionOptions["speech_models"] => {
    if (model === "universal-3-pro") {
        return ["universal-3-pro", "universal-2"];
    }

    return ["universal-2"];
};

const mapSpeakerOptions = (
    transcription: UserPreferences["transcription"],
): TranscriptionOptions["speaker_options"] | undefined => {
    if (!transcription.speakerId) {
        return undefined;
    }

    const speakers = parseKnownSpeakerValues(transcription.knownSpeakerValues);

    const speakerIdConfig: {
        speaker_type?: SpeakerType;
        speakers?: string[];
    } = {
        speaker_type: transcription.speakerType,
    };

    if (speakers) {
        speakerIdConfig.speakers = speakers;
    }

    return {
        speaker_id: true,
        speaker_id_config: speakerIdConfig,
    };
};

export const mapPreferencesToUploadOptions = (
    preferences: UserPreferences,
): TranscriptionOptions => {
    const transcription = preferences.transcription;
    const isUniversal2 = transcription.model === "universal-2";
    const autoDetect = isUniversal2 && transcription.autoDetectLanguage;
    const codeSwitching = autoDetect && transcription.codeSwitching;
    const prompt = transcription.prompt.trim();

    return {
        speaker_labels: transcription.speakerLabels,
        speakers_expected: Math.max(1, transcription.speakersExpected || 1),

        speech_models: mapSpeechModels(transcription.model),

        language_code: autoDetect ? AUTO_LANGUAGE_CODE : transcription.language,
        language_detection: autoDetect || undefined,
        language_detection_options: codeSwitching
            ? { code_switching: true }
            : undefined,

        prompt: prompt || undefined,

        speaker_options: mapSpeakerOptions(transcription),

        format_text: transcription.formatText,
        punctuate: transcription.punctuate,
        disfluencies: transcription.disfluencies,
    };
};
