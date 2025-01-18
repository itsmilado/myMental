const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const { AssemblyAI } = require("assemblyai");

const assemblyClient = new AssemblyAI({
    apiKey: process.env.ASSEMBLYAI_API_KEY,
});

const audioFile = "../../../audioTest.m4a";

const options = {
    audio: audioFile,
    speaker_labels: true,
    speech_model: "nano",
    language_code: "en",
};
const transcribeAudio = async () => {
    const transcript = await assemblyClient.transcripts.transcribe(options);
    if (transcript.status === "error") {
        z;
        console.log("ranscription error:", transcript.error);
    }
    console.log("Transcription:", transcript.text);

    for (let utterance of transcript.utterances) {
        console.log(`Speaker ${utterance.speaker}: ${utterance.text}`);
    }
};

const transcriptId = "a11d2ad2-94a9-4f40-b503-98bf9abf620b";
const getTranscript = async () => {
    const transcript = await assemblyClient.transcripts.get(transcriptId);
    console.log("Transcript:", transcript);
};

// transcribeAudio();
getTranscript();
