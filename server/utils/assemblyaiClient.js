// utils/assemblyaiClient.js

const { AssemblyAI } = require("assemblyai");
const https = require("https");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const ASSEMBLYAI_BASE_URL = "https://api.eu.assemblyai.com";

const createAssemblyClient = (apiKey) => {
    return new AssemblyAI({
        apiKey,
        baseUrl: ASSEMBLYAI_BASE_URL,
    });
};

const assemblyClient = createAssemblyClient(process.env.ASSEMBLYAI_API_KEY);

const validateAssemblyApiKey = (apiKey) => {
    return new Promise((resolve, reject) => {
        const key = String(apiKey || "").trim();

        if (!key) {
            return resolve({
                valid: false,
                message: "AssemblyAI API key is required.",
            });
        }

        const url = new URL("/v2/transcript?limit=1", ASSEMBLYAI_BASE_URL);

        const request = https.request(
            url,
            {
                method: "GET",
                headers: {
                    authorization: key,
                },
            },
            (response) => {
                let body = "";

                response.on("data", (chunk) => {
                    body += chunk;
                });

                response.on("end", () => {
                    if (response.statusCode === 200) {
                        return resolve({ valid: true, message: null });
                    }

                    if (
                        response.statusCode === 401 ||
                        response.statusCode === 403
                    ) {
                        return resolve({
                            valid: false,
                            message: "Invalid AssemblyAI API key.",
                        });
                    }

                    let message = `AssemblyAI validation failed with status ${response.statusCode}.`;

                    try {
                        const parsed = body ? JSON.parse(body) : null;
                        if (parsed?.error) {
                            message = String(parsed.error);
                        } else if (parsed?.message) {
                            message = String(parsed.message);
                        }
                    } catch {
                        // Response body is optional here.
                    }

                    return resolve({
                        valid: false,
                        message,
                    });
                });
            },
        );

        request.on("error", (error) => {
            reject(error);
        });

        request.end();
    });
};

module.exports = {
    ASSEMBLYAI_BASE_URL,
    assemblyClient,
    createAssemblyClient,
    validateAssemblyApiKey,
};
