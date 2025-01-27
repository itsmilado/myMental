// middlewares/sessionMiddleware.js

require("dotenv").config();
const session = require("express-session");
const { RedisStore } = require("connect-redis");
const redis = require("redis");
const logger = require("../utils/logger");

const redisClient = redis.createClient({
    url: process.env.REDIS_URL,
    password: process.env.REDIS_PASSWORD,
});

redisClient.connect().catch((error) => {
    logger.error(
        `[sessionMiddleware > - redisClient.connect()] Error => ${error.message}`
    );
});

redisClient.on("connect", () => {
    logger.info(
        `[sessionMiddleware > - redisClient.connect()] => Redis client succesfully connected.`
    );
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
            secure: false, // Set to true in production (true: only transmit cookies over HTTPS)
            httpOnly: process.env.NODE_ENV === "production", // Set to true in production (true: client side JS cannot access the cookie)
            maxAge: 1000 * 60 * 30, // expires in 30 minutes (1000ms * 60s * 30m)
        },
    });
} catch (error) {
    logger.error(
        `[sessionMiddleware > Error setting up session middleware: - redisClient.connect()] Error => ${error.message}`
    );
}

module.exports = { sessionMiddleware };
