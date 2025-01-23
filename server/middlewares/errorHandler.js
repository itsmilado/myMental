const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const logger = require("../utils/logger");

const errorHandler = (error, request, response, next) => {
    const statusCode = error.status || 500;
    const isDevelopment = process.env.NODE_ENV === "development";

    logger.error(
        `[errorHandler] => Status: ${statusCode}, Message: ${error.message} - Stack: ${error.stack}`
    );
    response.status(statusCode).json({
        success: false,
        message: error.message,
        ...(isDevelopment && { stack: error.stack }),
    });
};

module.exports = errorHandler;
