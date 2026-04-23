// server/middlewares/errorHandler.js

const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const logger = require("../utils/logger");

/*
- purpose: handle uncaught errors and return a standardized JSON response
- inputs: error object, express request, response, and next callback
- outputs: HTTP response with error status and message
- important behavior:
  - logs error details including status, message, and request context
  - includes stack trace only in development mode
*/
const errorHandler = (error, request, response, next) => {
    const statusCode = error.status || 500;
    const isDevelopment = process.env.NODE_ENV === "development";

    logger.error(
        `[errorHandler] => handle error: failed | ${JSON.stringify({
            statusCode,
            message: error.message,
            stack: isDevelopment ? error.stack : undefined,
        })}`,
    );

    response.status(statusCode).json({
        success: false,
        message: error.message,
        ...(isDevelopment && { stack: error.stack }),
    });
};

module.exports = errorHandler;
