// middlewares/roleMiddleware,js

const logger = require("../utils/logger");

/*
- purpose: authorize access to routes that require a specific user role
- inputs: required role string
- outputs: express middleware that forwards to next middleware or returns 403 json response
- important behavior:
  - compares the session user's role against the required role
  - logs authorization outcomes with request context
  - preserves the existing forbidden response structure
*/
const hasRole = (role) => {
    return (req, res, next) => {
        const currentRole = req.session?.user?.role;

        if (currentRole === role) {
            logger.info(
                `[roleMiddleware.hasRole] => authorize role: granted | ${JSON.stringify(
                    {
                        requiredRole: role,
                        currentRole,
                    },
                )}`,
            );
            return next();
        }

        logger.warn(
            `[roleMiddleware.hasRole] => authorize role: denied | ${JSON.stringify(
                {
                    requiredRole: role,
                    currentRole: currentRole || "none",
                },
            )}`,
        );

        return res.status(403).json({
            success: false,
            message: "You are not authorized to access this resource!",
        });
    };
};

module.exports = { hasRole };
