// middlewares/roleMiddleware,js

const logger = require("../utils/logger");

const hasRole = (role) => {
    return (req, res, next) => {
        const currentRole = req.session?.user?.role;
        if (currentRole === role) {
            logger.info(`User authorized with role: ${req.session.user.role}`);
            return next();
        } else {
            logger.warn(
                `User not authorized. Current role: ${currentRole || "none"}`,
            );
            return res.status(403).json({
                success: false,
                message: "You are not authorized to access this resource!",
            });
        }
    };
};

module.exports = { hasRole };
