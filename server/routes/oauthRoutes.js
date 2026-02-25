// routes/oauthRoutes.js

const express = require("express");
const {
    startGoogleOAuth,
    googleOAuthCallback,
} = require("../middlewares/oauthRoutesHandler");
const {
    authStartLimiter,
    authCallbackLimiter,
} = require("../middlewares/rateLimiters");

const oauthRoutes = express.Router();

oauthRoutes.get("/google", authStartLimiter, startGoogleOAuth);
oauthRoutes.get("/google/callback", authCallbackLimiter, googleOAuthCallback);

module.exports = { oauthRoutes };
