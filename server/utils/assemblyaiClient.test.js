const path = require("path");
const axios = require("axios");
const { AssemblyAI } = require("assemblyai");
const {
    transcribeAudio,
    assemblyClientUpload,
    assemblyClient,
} = require("./assemblyaiClient");

jest.mock("assemblyai");
jest.mock("axios");

describe("AssemblyAI Client", () => {
    describe("transcribeAudio", () => {
        it("should transcribe audio successfully", async () => {
            const audioUrl = "https://example.com/audio.mp3";
            const transcriptionOptions = {
                speaker_labels: true,
                speakers_expected: 2,
                sentiment_analysis: true,
                speech_model: "nano",
                language_code: "en",
                return_word_timestamps: false,
            };
            const mockTranscript = { id: "12", status: "completed" };

            AssemblyAI.prototype.transcripts = {
                create: jest.fn().mockResolvedValue(mockTranscript),
            };
            const result = await transcribeAudio(audioUrl);
            expect(result).toEqual(mockTranscript);
            expect(
                AssemblyAI.prototype.transcripts.create
            ).toHaveBeenCalledWith({
                audio_url: audioUrl,
                ...transcriptionOptions,
            });
        });
    });

    it("should throw an error if transcription fails", async () => {
        const audioUrl = "https://example.com/audio.mp3";
        const transcriptionOptions = {
            speaker_labels: true,
            speakers_expected: 2,
            sentiment_analysis: true,
            speech_model: "nano",
            language_code: "en",
            return_word_timestamps: false,
        };
        const mockError = new Error("Transcription failed");
        AssemblyAI.prototype.transcripts = {
            create: jest.fn().mockRejectedValue(mockError),
        }; // mock error
        await expect(transcribeAudio(audioUrl)).rejects.toThrow(
            "Transcription failed"
        );
        expect(AssemblyAI.prototype.transcripts.create).toHaveBeenCalledWith({
            audio_url: audioUrl,
            ...transcriptionOptions,
        });
    });
});
