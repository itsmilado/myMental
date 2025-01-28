// middlewares/roleMiddleware,js

const logger = require("../utils/logger");

const hasRole = (role) => {
    return (req, res, next) => {
        if (req.session && req.session.user && req.session.user.role === role) {
            logger.info(`User authorized with role: ${req.session.user.role}`);
            return next();
        } else {
            logger.warn(
                `User not authorized with role: ${req.session.user.role}`
            );
            return res
                .status(403)
                .json({
                    success: false,
                    message: "You are not authorized to access this resource!",
                });
        }
    };
};

module.exports = { hasRole };
