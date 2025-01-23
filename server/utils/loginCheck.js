// utils/loginCheck.js

const logger = require("../utils/logger");
const { compare } = require("bcryptjs");
const { getUserByEmailQuery } = require("../db/usersQueries");

const loginCheck = async ({ email, password }) => {
    const matchedUser = await getUserByEmailQuery({ email });
    if (!matchedUser) {
        return null;
    }
    logger.info(
        `Login Check Matched Found: user_id(${JSON.stringify(matchedUser.id)})`
    );
    const match = await compare(password, matchedUser.hashed_password);
    if (!match) {
        return null;
    }
    return matchedUser;
};

module.exports = loginCheck;
