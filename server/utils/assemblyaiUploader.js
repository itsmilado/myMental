// utils/assemblyaiUploader.js

const axios = require("axios");
const fs = require("fs").promises;
const logger = require("./logger");

const uploadAudioFile = async (filePath) => {
    const baseUrl = "https://api.eu.assemblyai.com/v2/upload";
    const headers = {
        "content-type": "application/octet-stream",
        authorization: process.env.ASSEMBLYAI_API_KEY,
    };

    try {
        const audioData = await fs.readFile(filePath);
        const response = await axios.post(baseUrl, audioData, { headers });

        if (!response.data || !response.data.upload_url) {
            throw new Error("Invalid response from AssemblyAI during upload");
        }

        logger.info(
            `[uploadAudioFile] => Upload successful: ${response.data.upload_url}`
        );
        return response.data.upload_url;
    } catch (error) {
        logger.error(
            `[uploadAudioFile] => Error uploading file: ${error.message}`
        );
        throw error;
    }
};

module.exports = uploadAudioFile;
