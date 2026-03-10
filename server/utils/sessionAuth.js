// utils/sessionAuth.js

const THIRTY_DAYS_MS = 1000 * 60 * 60 * 24 * 30;

const regenerateSession = (req) =>
    new Promise((resolve, reject) => {
        req.session.regenerate((err) => {
            if (err) return reject(err);
            resolve();
        });
    });

const saveSession = (req) =>
    new Promise((resolve, reject) => {
        req.session.save((err) => {
            if (err) return reject(err);
            resolve();
        });
    });

const establishAuthenticatedSession = async (req, user, options = {}) => {
    const {
        rememberMe = false,
        preserveCsrfToken = true,
        preserveReauthenticatedAt = false,
    } = options;

    const previousCsrfToken =
        preserveCsrfToken && req.session?.csrfToken
            ? req.session.csrfToken
            : null;

    const previousReauthenticatedAt =
        preserveReauthenticatedAt && req.session?.reauthenticatedAt
            ? req.session.reauthenticatedAt
            : null;

    await regenerateSession(req);

    if (previousCsrfToken) {
        req.session.csrfToken = previousCsrfToken;
    }

    if (previousReauthenticatedAt) {
        req.session.reauthenticatedAt = previousReauthenticatedAt;
    }

    req.session.user = {
        id: user.id,
        email: user.email,
        role: user.user_role ?? user.role,
    };

    if (rememberMe) {
        req.session.cookie.maxAge = THIRTY_DAYS_MS;
    } else {
        req.session.cookie.expires = false;
        req.session.cookie.maxAge = null;
    }

    await saveSession(req);
};

module.exports = {
    establishAuthenticatedSession,
};
