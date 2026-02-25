// middlewares/rateLimiters.js

const { rateLimit, ipKeyGenerator } = require("express-rate-limit");

const keyGenerator = (req) => ipKeyGenerator(req.ip);

const loginLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    limit: 10,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator,
    message: {
        success: false,
        message: "Too many login attempts. Try again later.",
    },
});

const authStartLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    limit: 60,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator,
    message: { success: false, message: "Too many requests. Try again later." },
});

const authCallbackLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    limit: 120,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator,
    message: { success: false, message: "Too many requests. Try again later." },
});

module.exports = {
    loginLimiter,
    authStartLimiter,
    authCallbackLimiter,
};
