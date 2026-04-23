// utils/loginCheck.js

const logger = require("../utils/logger");
const { compare } = require("bcryptjs");
const { getUserByEmailQuery } = require("../db/usersQueries");

const loginCheck = async ({ email, password }) => {
    const matchedUser = await getUserByEmailQuery({ email });
    if (!matchedUser) {
        return false;
    }
    logger.info(
        `[loginCheck] => process Login with password: success | ${JSON.stringify({ user_id: matchedUser.id })}`,
    );
    const hasPassword = Boolean(matchedUser.hashed_password);
    const hasGoogleAuth = Boolean(matchedUser.google_sub);

    // Block only true Google-only accounts
    if (!hasPassword && hasGoogleAuth) {
        return { blocked: true, reason: "google_only" };
    }

    const match = await compare(password, matchedUser.hashed_password);
    if (!match) {
        return false;
    }
    return matchedUser;
};

module.exports = loginCheck;
