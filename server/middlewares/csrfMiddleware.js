// middlewares/csrfMiddleware.js

const crypto = require("crypto");
const logger = require("../utils/logger");

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const CSRF_HEADER = "x-csrf-token";

const ensureCsrfToken = (req) => {
    if (!req.session) {
        throw new Error("Session is required before CSRF protection.");
    }

    if (!req.session.csrfToken) {
        req.session.csrfToken = crypto.randomBytes(32).toString("hex");
    }

    return req.session.csrfToken;
};

const sameOrigin = (req) => {
    const appOrigin = String(process.env.APP_ORIGIN || "").trim();
    if (!appOrigin) return true;

    const origin = req.get("origin");
    if (origin) {
        return origin === appOrigin;
    }

    const referer = req.get("referer");
    if (!referer) {
        return false;
    }

    try {
        return new URL(referer).origin === appOrigin;
    } catch {
        return false;
    }
};

const issueCsrfToken = (req, res, next) => {
    try {
        const csrfToken = ensureCsrfToken(req);

        return req.session.save((err) => {
            if (err) return next(err);

            return res.status(200).json({
                success: true,
                csrfToken,
            });
        });
    } catch (error) {
        return next(error);
    }
};

const csrfProtection = (req, res, next) => {
    try {
        if (SAFE_METHODS.has(req.method)) {
            return next();
        }

        if (!sameOrigin(req)) {
            logger.warn(
                `[csrfProtection] Origin check failed for ${req.method} ${req.originalUrl}`,
            );
            return res.status(403).json({
                success: false,
                message: "Invalid request origin.",
            });
        }

        const sessionToken = req.session?.csrfToken;
        const requestToken = String(req.get(CSRF_HEADER) || "").trim();

        if (!sessionToken || !requestToken || sessionToken !== requestToken) {
            logger.warn(
                `[csrfProtection] CSRF token validation failed for ${req.method} ${req.originalUrl}`,
            );
            return res.status(403).json({
                success: false,
                message: "Invalid CSRF token.",
            });
        }

        return next();
    } catch (error) {
        return next(error);
    }
};

module.exports = {
    issueCsrfToken,
    csrfProtection,
};
