// middlewares/authMiddleware.js

const logger = require("../utils/logger");

const isAuthenticated = (request, response, next) => {
    logger.info(
        `[isAuthenticated] => User is attempting to access with user_id: ${request.session.user.id} Role: ${request.session.user.role}`
    );
    if (!request.session || !request.session.user) {
        logger.warn(
            `[isAuthenticated] => Unauthorized User attempted to request: ${request.method} ${request.originalUrl}`
        );
        response.status(401).json({
            success: false,
            message: "Unauthorized access. Please log in.",
        });
        return false;
    }
    logger.info(`[isAuthenticated] => User is authenticated`);
    next();
};

module.exports = { isAuthenticated };
