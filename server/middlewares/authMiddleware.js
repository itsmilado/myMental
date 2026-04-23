// middlewares/authMiddleware.js

const logger = require("../utils/logger");

/*
- purpose: block access for requests without an authenticated session user
- inputs: express request, response, and next callback
- outputs: forwards to next middleware or returns 401 json response
- important behavior:
  - logs only unauthorized access attempts to reduce request noise
  - keeps auth failure metadata limited to method and route
*/
const isAuthenticated = (request, response, next) => {
    if (!request.session || !request.session.user) {
        logger.warn(
            `[authMiddleware.isAuthenticated] => authorize request: denied | ${JSON.stringify(
                {
                    reason: "missing_session_user",
                },
            )}`,
        );

        response.status(401).json({
            success: false,
            message: "Unauthorized access. Please log in.",
        });
        return false;
    }

    next();
};

const hasRecentReauth = (request, windowMs = 1000 * 60 * 5) => {
    const ts = request.session?.reauthenticatedAt;
    const now = Date.now();

    if (!ts || now - ts > windowMs) {
        return false;
    }

    return true;
};

/*
- purpose: require a recent re-authentication timestamp before allowing sensitive actions
- inputs: re-authentication validity window in milliseconds
- outputs: express middleware that forwards to next middleware or returns 403 json response
- important behavior:
  - logs only failed re-authentication checks to reduce noise
  - includes request metadata for traceability without exposing session data
  - preserves the existing response contract and expiration logic
*/
const requireRecentReauth = (windowMs = 1000 * 60 * 5) => {
    return (req, res, next) => {
        const ts = req.session?.reauthenticatedAt;
        const now = Date.now();

        if (!ts || now - ts > windowMs) {
            logger.warn(
                `[authMiddleware.requireRecentReauth] => validate reauth: denied | ${JSON.stringify(
                    {
                        reason: "missing_or_expired_reauth",
                    },
                )}`,
            );

            return res.status(403).json({
                success: false,
                message: "Re-authentication required",
            });
        }

        return next();
    };
};

module.exports = { isAuthenticated, requireRecentReauth, hasRecentReauth };
