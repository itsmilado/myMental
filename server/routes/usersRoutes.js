const express = require("express");
const usersRoutes = express.Router();
const {
    createUsers,
    // userLogin,
    // userLoggedOut,
    // getUserInfo,
    // checkloggedIn,
} = require("../middlewares/usersRoutesHandler");
const {
    validateSignupRules,
    handleValidationErrors,
} = require("../middlewares/validationMiddleware");

usersRoutes.post(
    "/signup",
    validateSignupRules,
    handleValidationErrors,
    createUsers
);

// usersRoutes.post("/login", userLogin, errorHandler);
// usersRoutes.post("/logout", userLoggedOut);

// usersRoutes.get("/profile/:user_id", getUserInfo, errorHandler);
// usersRoutes.get("/checkLogin", checkloggedIn);

module.exports = { usersRoutes };
