// middlewares/oauthRoutesHandler.js

require("dotenv").config();
const crypto = require("crypto");
const { OAuth2Client } = require("google-auth-library");
const logger = require("../utils/logger");
const { hashPassword } = require("../utils/hashPass");
const {
    getUserByEmailQuery,
    createUserQuery,
    getUserByGoogleSubQuery,
    linkGoogleSubByIdQuery,
} = require("../db/usersQueries");

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
const googleRedirectUri = process.env.GOOGLE_REDIRECT_URI;

const appOrigin = process.env.APP_ORIGIN || "http://localhost:3002";
const oauthSuccessRedirect = `${appOrigin}/oauth/callback`;
const oauthErrorRedirect = `${appOrigin}/oauth/callback?error=oauth_failed`;

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

const startGoogleOAuth = async (req, res, next) => {
    try {
        requireGoogleEnv();

        const state = crypto.randomBytes(24).toString("hex");
        req.session.oauthState = state;

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

const googleOAuthCallback = async (req, res, next) => {
    try {
        requireGoogleEnv();

        const code = String(req.query?.code || "");
        const state = String(req.query?.state || "");
        const sessionState = String(req.session?.oauthState || "");

        // one-time state
        req.session.oauthState = null;

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

        const google_sub = payload.sub;
        const email = String(payload.email || "")
            .trim()
            .toLowerCase();
        const first_name = String(payload.given_name || "User").trim();
        const last_name = String(payload.family_name || "").trim();

        if (!google_sub || !email) {
            return res.redirect(oauthErrorRedirect);
        }

        // 1) already linked by google_sub
        let user = await getUserByGoogleSubQuery({ google_sub });

        // 2) else: match by email (link local account)
        if (!user) {
            const byEmail = await getUserByEmailQuery({ email });
            if (byEmail) {
                // if account exists but is linked to different google_sub, block
                if (byEmail.google_sub && byEmail.google_sub !== google_sub) {
                    return res.redirect(
                        `${oauthErrorRedirect}&reason=conflict`,
                    );
                }

                user = await linkGoogleSubByIdQuery({
                    id: byEmail.id,
                    google_sub,
                });
            }
        }

        // 3) else: create a new user with provider=google
        if (!user) {
            // required by schema; do not allow password login for google users unless later “set password”
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
        }

        // session login
        req.session.user = {
            id: user.id,
            email: user.email,
            role: user.user_role,
        };

        // persistent cookie behavior
        req.session.save(() => res.redirect(oauthSuccessRedirect));
    } catch (err) {
        logger.error(`[googleOAuthCallback] => ${err.message}`);
        return res.redirect(oauthErrorRedirect);
    }
};

module.exports = {
    startGoogleOAuth,
    googleOAuthCallback,
};
