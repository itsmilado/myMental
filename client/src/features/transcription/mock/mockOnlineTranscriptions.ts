import { OnlineTranscription } from "../../../types/types";

export const mockOnlineTranscriptions: OnlineTranscription[] = [
    {
        transcript_id: "abc-123",
        created_at: "2025-06-21 10:25",
        status: "completed",
        project: "HR Interviews",
        audio_url: "https://example.com/audio1.mp3",
        audio_duration: "03:24",
        speech_model: "slam-1",
        language: "en-US",
        features: ["speaker_labels", "entity_detection"],
    },
    {
        transcript_id: "xyz-789",
        created_at: "2025-06-20 17:04",
        status: "processing",
        project: "Sales Call",
        audio_url: "https://example.com/audio2.mp3",
        audio_duration: "01:10",
        speech_model: "universal",
        language: "en-US",
        features: ["speaker_labels"],
    },
];
