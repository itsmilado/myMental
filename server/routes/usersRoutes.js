const express = require("express");
const usersRoutes = express.Router();
const {
    createUsers,
    getUserInfo,
    userLogin,
    userLoggedOut,
    // checkloggedIn,
} = require("../middlewares/usersRoutesHandler");
const errorHandler = require("../middlewares/errorHandler");
const {
    validateSignupRules,
    validationLoginRules,
    handleValidationErrors,
} = require("../middlewares/validationMiddleware");

usersRoutes.post(
    "/signup",
    validateSignupRules,
    handleValidationErrors,
    createUsers,
    errorHandler
);

usersRoutes.post(
    "/login",
    validationLoginRules,
    handleValidationErrors,
    userLogin,
    errorHandler
);
usersRoutes.get("/profile/:user_id", getUserInfo, errorHandler);
usersRoutes.post("/logout", userLoggedOut);

// usersRoutes.get("/checkLogin", checkloggedIn);

module.exports = { usersRoutes };
