// middlewares/oauthRoutesHandler.js

const crypto = require("crypto");
const { OAuth2Client } = require("google-auth-library");
const logger = require("../utils/logger");
const { establishAuthenticatedSession } = require("../utils/sessionAuth");
const { hashPassword } = require("../utils/hashPass");
const {
    getUserByEmailQuery,
    getUserByIdQuery,
    createUserQuery,
    getUserByGoogleSubQuery,
    linkGoogleSubByIdQuery,
} = require("../db/usersQueries");

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
const googleRedirectUri = process.env.GOOGLE_REDIRECT_URI;

const appOrigin = process.env.APP_ORIGIN || "http://localhost:3002";
const oauthSuccessRedirect = `${appOrigin}/oauth/callback`;
const oauthErrorRedirect = `${appOrigin}/oauth/callback?error=Google sign-in failed. Please try again.`;
const accountRedirectBase = `${appOrigin}/dashboard/account`;

const oauth2 = new OAuth2Client({
    clientId: googleClientId,
    clientSecret: googleClientSecret,
    redirectUri: googleRedirectUri,
});

const requireGoogleEnv = () => {
    if (!googleClientId || !googleClientSecret || !googleRedirectUri) {
        throw new Error(
            "Missing GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_REDIRECT_URI",
        );
    }
};

const redirectWithParams = (base, params = {}) => {
    const url = new URL(base);
    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
            url.searchParams.set(key, String(value));
        }
    });
    return url.toString();
};

const getOAuthIntent = (req) => {
    const raw = String(req.query?.intent || "signin").toLowerCase();

    const allowed = new Set([
        "signin",
        "link",
        "reauth_email",
        "reauth_delete",
        "reauth_unlink",
    ]);

    return allowed.has(raw) ? raw : "signin";
};

const hasRecentReauth = (req, windowMs = 1000 * 60 * 5) => {
    const ts = req.session?.reauthenticatedAt;
    if (!ts) return false;
    return Date.now() - ts <= windowMs;
};

const startGoogleOAuth = async (req, res, next) => {
    try {
        requireGoogleEnv();

        const state = crypto.randomBytes(24).toString("hex");
        req.session.oauthState = state;
        req.session.oauthIntent = getOAuthIntent(req);

        const url = oauth2.generateAuthUrl({
            access_type: "online",
            prompt: "select_account",
            scope: ["openid", "email", "profile"],
            state,
        });

        return res.redirect(url);
    } catch (err) {
        logger.error(`[startGoogleOAuth] => ${err.message}`);
        return next(err);
    }
};

const googleOAuthCallback = async (req, res) => {
    try {
        requireGoogleEnv();

        const code = String(req.query?.code || "");
        const state = String(req.query?.state || "");
        const sessionState = String(req.session?.oauthState || "");
        const intent = String(req.session?.oauthIntent || "signin");

        req.session.oauthState = null;
        req.session.oauthIntent = null;

        if (!code || !state || !sessionState || state !== sessionState) {
            return res.redirect(oauthErrorRedirect);
        }

        const { tokens } = await oauth2.getToken(code);
        if (!tokens?.id_token) {
            return res.redirect(oauthErrorRedirect);
        }

        const ticket = await oauth2.verifyIdToken({
            idToken: tokens.id_token,
            audience: googleClientId,
        });

        const payload = ticket.getPayload();
        if (!payload) return res.redirect(oauthErrorRedirect);

        const google_sub = String(payload.sub || "").trim();
        const email = String(payload.email || "")
            .trim()
            .toLowerCase();
        const emailVerified = payload.email_verified === true;
        const first_name = String(payload.given_name || "User").trim();
        const last_name = String(payload.family_name || "").trim();

        if (!google_sub || !email || !emailVerified) {
            return res.redirect(
                redirectWithParams(oauthSuccessRedirect, {
                    error: "Google account email is missing or not verified.",
                }),
            );
        }

        const isReauthIntent =
            intent === "reauth_email" ||
            intent === "reauth_delete" ||
            intent === "reauth_unlink";

        if (isReauthIntent) {
            const sessionUser = req.session?.user;

            if (!sessionUser?.id) {
                return res.redirect(
                    redirectWithParams(accountRedirectBase, {
                        error: "Please sign in again to continue.",
                    }),
                );
            }

            const currentUser = await getUserByIdQuery({ id: sessionUser.id });
            if (!currentUser) {
                return res.redirect(
                    redirectWithParams(accountRedirectBase, {
                        error: "User not found.",
                    }),
                );
            }

            if (!currentUser.google_sub) {
                return res.redirect(
                    redirectWithParams(accountRedirectBase, {
                        error: "Google sign-in is not linked to this account.",
                    }),
                );
            }

            if (String(currentUser.google_sub) !== String(google_sub)) {
                return res.redirect(
                    redirectWithParams(accountRedirectBase, {
                        error: "The selected Google account does not match this user.",
                    }),
                );
            }

            req.session.reauthenticatedAt = Date.now();

            const mappedIntent =
                intent === "reauth_email"
                    ? "email"
                    : intent === "reauth_delete"
                      ? "delete"
                      : "unlink";

            return req.session.save(() =>
                res.redirect(
                    redirectWithParams(accountRedirectBase, {
                        reauth: "success",
                        intent: mappedIntent,
                        message: "Identity verified successfully.",
                    }),
                ),
            );
        }

        if (intent === "link") {
            const sessionUser = req.session?.user;

            if (!sessionUser) {
                return res.redirect(
                    redirectWithParams(accountRedirectBase, {
                        error: "You need to be signed in before linking Google.",
                    }),
                );
            }

            if (!hasRecentReauth(req)) {
                return res.redirect(
                    redirectWithParams(accountRedirectBase, {
                        error: "Please re-authenticate before linking Google.",
                    }),
                );
            }

            if (String(sessionUser.email || "").toLowerCase() !== email) {
                return res.redirect(
                    redirectWithParams(accountRedirectBase, {
                        error: "Use the Google account that matches your current email address.",
                    }),
                );
            }

            const byEmail = await getUserByEmailQuery({ email });
            if (!byEmail || byEmail.id !== sessionUser.id) {
                return res.redirect(
                    redirectWithParams(accountRedirectBase, {
                        error: "This Google account does not match the signed-in user.",
                    }),
                );
            }

            if (byEmail.google_sub && byEmail.google_sub !== google_sub) {
                return res.redirect(
                    redirectWithParams(accountRedirectBase, {
                        error: "A different Google account is already linked here.",
                    }),
                );
            }

            const user = await linkGoogleSubByIdQuery({
                id: byEmail.id,
                google_sub,
            });

            req.session.user = {
                id: user.id,
                email: user.email,
                role: user.user_role,
            };

            return req.session.save(() =>
                res.redirect(
                    redirectWithParams(accountRedirectBase, {
                        linked: 1,
                        message: "Google sign-in linked successfully.",
                    }),
                ),
            );
        }

        let user = await getUserByGoogleSubQuery({ google_sub });
        if (user) {
            await establishAuthenticatedSession(req, user);
            return res.redirect(oauthSuccessRedirect);
        }

        const byEmail = await getUserByEmailQuery({ email });
        if (byEmail) {
            if (byEmail.google_sub && byEmail.google_sub !== google_sub) {
                return res.redirect(
                    `${oauthSuccessRedirect}?error=This Google account conflicts with an existing linked account.`,
                );
            }

            return res.redirect(
                `${oauthSuccessRedirect}?error=This email already exists. Sign in normally and link Google from Account settings.`,
            );
        }

        const randomPassword = crypto.randomBytes(32).toString("hex");
        const hashed_password = await hashPassword(randomPassword);

        user = await createUserQuery({
            first_name,
            last_name,
            email,
            hashed_password,
            user_role: "user",
            auth_provider: "google",
            google_sub,
        });

        await establishAuthenticatedSession(req, user);
        return res.redirect(oauthSuccessRedirect);
    } catch (err) {
        logger.error(`[googleOAuthCallback] => ${err.message}`);
        return res.redirect(oauthErrorRedirect);
    }
};

module.exports = {
    startGoogleOAuth,
    googleOAuthCallback,
};
