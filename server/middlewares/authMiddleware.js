// middlewares/authMiddleware.js

const logger = require("../utils/logger");

const isAuthenticated = (request, response, next) => {
    logger.info(
        `[isAuthenticated] => User is attempting to access "${request.method} ${request.originalUrl}" `,
    );
    if (!request.session || !request.session.user) {
        logger.warn(
            `[isAuthenticated] => Unauthorized User attempted to request: ${request.method} ${request.originalUrl}`,
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

const requireRecentReauth = (windowMs = 1000 * 60 * 5) => {
    return (req, res, next) => {
        const ts = req.session?.reauthenticatedAt;
        const now = Date.now();

        if (!ts || now - ts > windowMs) {
            logger.warn("[requireRecentReauth] Reauth required or expired");
            return res.status(403).json({
                success: false,
                message: "Re-authentication required",
            });
        }

        return next();
    };
};

module.exports = { isAuthenticated, requireRecentReauth };
