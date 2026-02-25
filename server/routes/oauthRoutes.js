const express = require("express");
const {
    startGoogleOAuth,
    googleOAuthCallback,
} = require("../middlewares/oauthRoutesHandler");

const oauthRoutes = express.Router();

oauthRoutes.get("/google", startGoogleOAuth);
oauthRoutes.get("/google/callback", googleOAuthCallback);

module.exports = { oauthRoutes };
