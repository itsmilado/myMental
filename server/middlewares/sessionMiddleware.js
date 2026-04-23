// middlewares/sessionMiddleware.js

require("dotenv").config();
const session = require("express-session");
const { RedisStore } = require("connect-redis");
const redis = require("redis");
const logger = require("../utils/logger");
const isProd = process.env.NODE_ENV === "production";

const redisClient = redis.createClient({
    url: process.env.REDIS_URL,
    password: process.env.REDIS_PASSWORD,
});

redisClient.connect().catch((error) => {
    logger.error(
        `[sessionMiddleware.redisClient] => connect redis: failed | ${JSON.stringify(
            {
                error: error.message,
            },
        )}`,
    );
});

redisClient.on("connect", () => {
    logger.info(`[sessionMiddleware.redisClient] => connect redis: success`);
});

let sessionMiddleware;

try {
    sessionMiddleware = session({
        store: new RedisStore({ client: redisClient }),
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: false,
        name: "sessionId",
        cookie: {
            secure: isProd, // Set to true in production (true: only transmit cookies over HTTPS)
            httpOnly: true, // Set to true in production (true: client side JS cannot access the cookie)
            sameSite: "lax",
        },
    });
} catch (error) {
    logger.error(
        `[sessionMiddleware.session] => initialize middleware: failed | ${JSON.stringify(
            {
                error: error.message,
            },
        )}`,
    );
}

module.exports = { sessionMiddleware };
