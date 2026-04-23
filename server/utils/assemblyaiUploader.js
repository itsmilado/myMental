// utils/assemblyaiUploader.js

const axios = require("axios");
const fs = require("fs").promises;
const logger = require("./logger");

/*
- purpose: upload an audio file to AssemblyAI and return the remote upload url
- inputs: local file path and optional AssemblyAI api key
- outputs: AssemblyAI upload url string
*/
const uploadAudioFile = async (filePath, apiKey) => {
    const baseUrl = "https://api.eu.assemblyai.com/v2/upload";
    const resolvedApiKey = String(
        apiKey || process.env.ASSEMBLYAI_API_KEY || "",
    ).trim();

    if (!resolvedApiKey) {
        throw new Error("AssemblyAI API key is required for upload.");
    }

    const headers = {
        "content-type": "application/octet-stream",
        authorization: resolvedApiKey,
    };

    try {
        const audioData = await fs.readFile(filePath);
        const response = await axios.post(baseUrl, audioData, { headers });

        if (!response.data || !response.data.upload_url) {
            throw new Error("Invalid response from AssemblyAI during upload");
        }

        logger.info(
            `[assemblyaiUploader.uploadAudioFile] => upload audio: success | ${JSON.stringify(
                {
                    filePath,
                },
            )}`,
        );

        return response.data.upload_url;
    } catch (error) {
        logger.error(
            `[assemblyaiUploader.uploadAudioFile] => upload audio: failed | ${JSON.stringify(
                {
                    filePath,
                    error: error.message,
                },
            )}`,
        );
        throw error;
    }
};

module.exports = uploadAudioFile;
