// utils/assemblyaiClient.js

const { AssemblyAI } = require("assemblyai");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

// Initialize AssemblyAI client
const assemblyClient = new AssemblyAI({
    apiKey: process.env.ASSEMBLYAI_API_KEY,
    baseUrl: "https://api.eu.assemblyai.com",
});

module.exports = {
    assemblyClient,
};
