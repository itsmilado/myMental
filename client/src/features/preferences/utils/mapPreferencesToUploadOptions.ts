//src/features/preferences/utils/mapPreferencesToUploadOptions.ts

import type {
    SpeakerType,
    TranscriptionOptions,
    UserPreferences,
} from "../../../types/types";

const AUTO_LANGUAGE_CODE = "auto";

const parseKnownSpeakerValues = (rawValue?: string): string[] | undefined => {
    const values = (rawValue ?? "")
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);

    return values.length > 0 ? values : undefined;
};

const mapSpeechModels = (
    model?: UserPreferences["transcription"]["model"],
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
        speaker_type: transcription.speakerType ?? "name",
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

    const model = transcription.model ?? "universal-2";
    const isUniversal2 = model === "universal-2";
    const isUniversal3Pro = model === "universal-3-pro";

    const autoDetect =
        isUniversal3Pro ||
        (isUniversal2 && Boolean(transcription.autoDetectLanguage));

    const codeSwitching =
        isUniversal2 && autoDetect && Boolean(transcription.codeSwitching);

    const language =
        transcription.language && transcription.language !== AUTO_LANGUAGE_CODE
            ? transcription.language
            : "en_us";
    const prompt = (transcription.prompt ?? "").trim();

    return {
        speaker_labels: Boolean(transcription.speakerLabels),
        speakers_expected: Math.max(
            1,
            Number(transcription.speakersExpected) || 1,
        ),

        speech_models: mapSpeechModels(model),

        language_code: autoDetect ? AUTO_LANGUAGE_CODE : language,
        language_detection: autoDetect || undefined,
        language_detection_options: codeSwitching
            ? { code_switching: true }
            : undefined,

        prompt: prompt || undefined,

        speaker_options: mapSpeakerOptions({
            ...transcription,
            speakerType: transcription.speakerType ?? "name",
            knownSpeakerValues: transcription.knownSpeakerValues ?? "",
            speakerId: Boolean(transcription.speakerId),
        }),

        format_text: Boolean(transcription.formatText),
        punctuate:
            transcription.punctuate === undefined
                ? true
                : Boolean(transcription.punctuate),
        disfluencies: Boolean(transcription.disfluencies),
    };
};
