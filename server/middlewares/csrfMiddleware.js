// middlewares/csrfMiddleware.js

const crypto = require("crypto");
const logger = require("../utils/logger");

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const CSRF_HEADER = "x-csrf-token";

/**
 * Ensures a CSRF token exists in the user's session.
 *
 * Behavior:
 * - Generates a secure random token if missing
 * - Stores token in session
 *
 * Dependencies:
 * - express-session (req.session)
 * - crypto (secure random generation)
 *
 * Notes:
 * - Must be called AFTER session middleware
 * - Token is tied to session (not stateless)
 */
const ensureCsrfToken = (req) => {
    if (!req.session) {
        throw new Error("Session is required before CSRF protection.");
    }

    if (!req.session.csrfToken) {
        req.session.csrfToken = crypto.randomBytes(32).toString("hex");
    }

    return req.session.csrfToken;
};

/**
 * Validates that request originates from the same origin.
 *
 * Behavior:
 * - Compares request origin/referer against APP_ORIGIN
 * - Allows requests if APP_ORIGIN is not configured
 *
 * Notes:
 * - Protects against cross-site request forgery via origin spoofing
 * - Uses both Origin and Referer headers for compatibility
 */
const sameOrigin = (req) => {
    const appOrigin = String(process.env.APP_ORIGIN || "").trim();

    // If no origin configured, skip validation (dev fallback)
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

/**
 * Issues a CSRF token to the client.
 *
 * Behavior:
 * - Ensures token exists in session
 * - Persists session before responding
 * - Returns token to frontend
 *
 * Usage:
 * - GET /auth/csrf-token
 *
 * Notes:
 * - Frontend must store and send token in `x-csrf-token` header
 */
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

/**
 * Middleware to protect against CSRF attacks.
 *
 * Behavior:
 * - Skips validation for safe methods (GET, HEAD, OPTIONS)
 * - Validates request origin
 * - Validates CSRF token from header against session
 *
 * Dependencies:
 * - ensureCsrfToken (token generation)
 * - sameOrigin (origin validation)
 *
 * Security Notes:
 * - Requires session-based authentication
 * - Token must match exactly (no partial validation)
 * - Prevents cross-origin and forged requests
 *
 * Usage:
 * - Applied to protected routes (POST, PATCH, DELETE, etc.)
 */
const csrfProtection = (req, res, next) => {
    try {
        // Skip safe methods (read-only requests)
        if (SAFE_METHODS.has(req.method)) {
            return next();
        }

        // Validate origin before token check
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

        // Validate token presence and equality
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
