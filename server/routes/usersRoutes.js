// middlewares/usersRoutesHandler.js

const express = require("express");
const usersRoutes = express.Router();
const {
    createUsers,
    getUserInfo,
    userLogin,
    userLoggedOut,
    getAllProfiles,
    getCurrentUser,
    updateCurrentUser,
    getMyPreferences,
    patchMyPreferences,
    // checkloggedIn,
} = require("../middlewares/usersRoutesHandler");
const errorHandler = require("../middlewares/errorHandler");
const {
    validateSignupRules,
    validationLoginRules,
    handleValidationErrors,
} = require("../middlewares/validationMiddleware");

const { isAuthenticated } = require("../middlewares/authMiddleware");
const { hasRole } = require("../middlewares/roleMiddleware");

usersRoutes.post(
    "/signup",
    validateSignupRules,
    handleValidationErrors,
    createUsers,
    errorHandler,
);

usersRoutes.post(
    "/login",
    validationLoginRules,
    handleValidationErrors,
    userLogin,
    errorHandler,
);
usersRoutes.post("/logout", userLoggedOut, errorHandler);
usersRoutes.get("/profile/:id", isAuthenticated, getUserInfo, errorHandler);

usersRoutes.get(
    "/admin/all_profiles",
    isAuthenticated,
    hasRole("admin"),
    getAllProfiles,
    errorHandler,
);

usersRoutes.get("/me", getCurrentUser);

usersRoutes.patch("/me", isAuthenticated, updateCurrentUser);

usersRoutes.get("/me/preferences", isAuthenticated, getMyPreferences);

usersRoutes.patch("/me/preferences", isAuthenticated, patchMyPreferences);

module.exports = { usersRoutes };

// usersRoutes.get(
//     "/admin",
//     isAuthenticated,
//     hasRole("admin"),
//     adminProfile,
//     errorHandler
// );
