const { createLogger, format, transports } = require("winston");

// Define the logger configuration
const logger = createLogger({
    level: "info", // Log levels: error, warn, info, http, verbose, debug, silly
    format: format.combine(
        format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
        format.printf(({ timestamp, level, message }) => {
            return `${timestamp} [${level.toUpperCase()}]: ${message}`;
        })
    ),
    transports: [
        new transports.Console(), // Log to console
        new transports.File({ filename: "logs/app.log" }), // Log to a file
    ],
});

module.exports = logger;
