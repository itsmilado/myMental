// utils/assemblyaiConnectionResolver.js

const logger = require("../utils/logger");
const {
    assemblyClient,
    createAssemblyClient,
} = require("../utils/assemblyaiClient");
const { decryptSecret } = require("../utils/secretCrypto");
const {
    getUserApiKeyByIdQuery,
    getUserApiKeysQuery,
} = require("../db/userApiKeysQueries");

/*
- Build the normalized fallback resolver result for app-owned AssemblyAI access.
- Inputs: optional label override for metadata reuse.
- Outputs: resolver payload with shared client, raw apiKey, and fallback metadata.
- Important behavior: keeps fallback metadata explicit so follow-up flows stay deterministic.
*/
const buildAppFallbackResolution = ({ label = null } = {}) => {
    return {
        client: assemblyClient,
        apiKey: process.env.ASSEMBLYAI_API_KEY,
        assemblyai_connection_id: null,
        assemblyai_connection_label: label,
        assemblyai_connection_source: "app_fallback",
    };
};

/*
- Build a normalized resolver result for a stored user-managed AssemblyAI connection.
- Inputs: full DB connection row and the metadata source label to persist or reuse.
- Outputs: resolver payload with a connection-scoped client and decrypted apiKey.
- Important behavior: throws when encrypted_api_key is missing so callers never proceed with partial credentials.
*/
const buildUserConnectionResolution = ({ connection, source }) => {
    if (!connection?.encrypted_api_key) {
        throw new Error("AssemblyAI connection secret is not available.");
    }

    const decryptedKey = decryptSecret(connection.encrypted_api_key);

    return {
        client: createAssemblyClient(decryptedKey),
        apiKey: decryptedKey,
        assemblyai_connection_id: connection.id,
        assemblyai_connection_label: connection.label,
        assemblyai_connection_source: source,
    };
};

/*
- Load the user's active AssemblyAI connections in deterministic priority order.
- Inputs: authenticated user id.
- Outputs: ordered list with default active connection first, then other active connections.
- Important behavior: ignores inactive connections so resolution does not silently switch to disabled keys.
*/
const getOrderedActiveUserConnections = async ({ user_id }) => {
    const connections = await getUserApiKeysQuery({ user_id });

    return [
        ...connections.filter((connection) => {
            return (
                connection.is_default === true && connection.status === "active"
            );
        }),
        ...connections.filter((connection) => {
            return (
                connection.is_default !== true && connection.status === "active"
            );
        }),
    ];
};

/*
- Resolve the AssemblyAI connection for a new user-initiated request.
- Inputs: user id, optional explicit connection id, and explicit app fallback flag.
- Outputs: normalized resolver payload with client, apiKey, and metadata.
- Important behavior: applies explicit -> default active -> app fallback priority and never mixes fallback with explicit selection.
*/
const resolveAssemblyClientForRequest = async ({
    user_id,
    selectedConnectionId = null,
    useAppFallback = false,
}) => {
    if (!user_id) {
        throw new Error("User id is required for AssemblyAI resolution.");
    }

    if (useAppFallback) {
        return buildAppFallbackResolution();
    }

    if (selectedConnectionId != null) {
        const selectedConnection = await getUserApiKeyByIdQuery({
            id: selectedConnectionId,
            user_id,
        });

        if (!selectedConnection) {
            throw new Error("Selected AssemblyAI connection was not found.");
        }

        return buildUserConnectionResolution({
            connection: selectedConnection,
            source: "selected_connection",
        });
    }

    const orderedConnections = await getOrderedActiveUserConnections({
        user_id,
    });
    const defaultConnection = orderedConnections[0] ?? null;

    if (defaultConnection) {
        const fullDefaultConnection = await getUserApiKeyByIdQuery({
            id: defaultConnection.id,
            user_id,
        });

        if (!fullDefaultConnection) {
            throw new Error("Default AssemblyAI connection was not found.");
        }

        return buildUserConnectionResolution({
            connection: fullDefaultConnection,
            source: "default_connection",
        });
    }

    return buildAppFallbackResolution();
};

/*
- Resolve the AssemblyAI connection that was originally used for an existing transcript.
- Inputs: user id plus optional transcription and backup rows that may carry stored metadata.
- Outputs: normalized resolver payload tied to the persisted connection context.
- Important behavior: never auto-switches to another user key when stored context exists or is required.
*/
const resolveAssemblyClientForStoredTranscript = async ({
    user_id,
    transcription = null,
    backup = null,
}) => {
    const storedConnectionId =
        transcription?.assemblyai_connection_id ??
        backup?.assemblyai_connection_id ??
        null;

    const storedConnectionSource =
        transcription?.assemblyai_connection_source ??
        backup?.assemblyai_connection_source ??
        "legacy_unknown";

    const storedConnectionLabel =
        transcription?.assemblyai_connection_label ??
        backup?.assemblyai_connection_label ??
        null;

    if (storedConnectionId != null) {
        const storedConnection = await getUserApiKeyByIdQuery({
            id: storedConnectionId,
            user_id,
        });

        if (!storedConnection) {
            throw new Error(
                "The AssemblyAI connection used for this transcript is no longer available.",
            );
        }

        return buildUserConnectionResolution({
            connection: storedConnection,
            source: storedConnectionSource,
        });
    }

    if (storedConnectionSource === "app_fallback") {
        return buildAppFallbackResolution({
            label: storedConnectionLabel,
        });
    }

    throw new Error(
        "No stored AssemblyAI connection context is available for this transcript.",
    );
};

/*
- Resolve AssemblyAI list/history access using the same centralized connection ordering rules.
- Inputs: user id and a callback that fetches transcript data with a provided apiKey.
- Outputs: the callback result for the first usable key, or for app fallback if no user key succeeds.
- Important behavior: keeps history probing deterministic, skips invalid keys safely, and preserves app fallback as the last resort.
*/
const resolveAssemblyHistoryWithFallback = async ({
    user_id,
    fetchWithApiKey,
}) => {
    if (!user_id) {
        throw new Error(
            "User id is required for AssemblyAI history resolution.",
        );
    }

    if (typeof fetchWithApiKey !== "function") {
        throw new Error("fetchWithApiKey callback is required.");
    }

    const orderedConnections = await getOrderedActiveUserConnections({
        user_id,
    });

    for (const connection of orderedConnections) {
        try {
            const fullConnection = await getUserApiKeyByIdQuery({
                id: connection.id,
                user_id,
            });

            if (!fullConnection?.encrypted_api_key) {
                continue;
            }

            const { apiKey } = buildUserConnectionResolution({
                connection: fullConnection,
                source: connection.is_default
                    ? "default_connection"
                    : "selected_connection",
            });

            return await fetchWithApiKey(apiKey);
        } catch (error) {
            logger.warn(
                `[assemblyaiConnectionResolver.resolveAssemblyHistoryWithFallback] => resolve assembly history connection: denied | ${JSON.stringify(
                    {
                        userId: user_id,
                        resourceId: connection.id,
                        reason: error.message,
                    },
                )}`,
            );
        }
    }

    return fetchWithApiKey(String(process.env.ASSEMBLYAI_API_KEY || "").trim());
};

module.exports = {
    resolveAssemblyClientForRequest,
    resolveAssemblyClientForStoredTranscript,
    resolveAssemblyHistoryWithFallback,
};
