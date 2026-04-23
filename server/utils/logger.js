//server/utils/logger.js

const { createLogger, format, transports } = require("winston");

/*
- purpose: build the final structured log line for all backend logger output
- inputs: winston log payload containing level, message, timestamp, and optional metadata
- outputs: normalized log string
- important behavior:
  - preserves existing timestamp and level output
  - standardizes message rendering for the shared backend logging format
  - appends metadata only when present
*/
function buildStructuredLogLine({
    level,
    message,
    timestamp,
    context,
    action,
    result,
    metadata,
}) {
    const normalizedMessage =
        typeof message === "string" && message.trim().length > 0
            ? message.trim()
            : "[logger] => log: emitted";

    const normalizedContext =
        typeof context === "string" && context.trim().length > 0
            ? context.trim()
            : null;

    const normalizedAction =
        typeof action === "string" && action.trim().length > 0
            ? action.trim()
            : null;

    const normalizedResult =
        typeof result === "string" && result.trim().length > 0
            ? result.trim()
            : null;

    const metadataValue =
        metadata &&
        typeof metadata === "object" &&
        !Array.isArray(metadata) &&
        Object.keys(metadata).length > 0
            ? ` | ${JSON.stringify(metadata)}`
            : "";

    if (normalizedContext && normalizedAction && normalizedResult) {
        return `${timestamp} [${level.toUpperCase()}] ${normalizedContext} => ${normalizedAction}: ${normalizedResult}${metadataValue}`;
    }

    return `${timestamp} [${level.toUpperCase()}] ${normalizedMessage}${metadataValue}`;
}
// Define the logger configuration
const logger = createLogger({
    level: "info",
    format: format.combine(
        format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
        format.printf((info) => {
            return buildStructuredLogLine({
                level: info.level,
                message: info.message,
                timestamp: info.timestamp,
                context: info.context,
                action: info.action,
                result: info.result,
                metadata: info.metadata,
            });
        }),
    ),
    transports: [
        new transports.Console(),
        new transports.File({ filename: "logs/app.log" }),
    ],
});

module.exports = logger;
