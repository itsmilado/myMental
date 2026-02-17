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
    reauthCurrentUser,
    deleteMe,
    changeMyPassword,
    // checkloggedIn,
} = require("../middlewares/usersRoutesHandler");
const errorHandler = require("../middlewares/errorHandler");
const {
    validateSignupRules,
    validationLoginRules,
    handleValidationErrors,
} = require("../middlewares/validationMiddleware");

const {
    isAuthenticated,
    requireRecentReauth,
} = require("../middlewares/authMiddleware");
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

usersRoutes.get("/me", getCurrentUser, errorHandler);

usersRoutes.patch("/me", isAuthenticated, updateCurrentUser, errorHandler);

usersRoutes.post(
    "/me/reauth",
    isAuthenticated,
    reauthCurrentUser,
    errorHandler,
);

usersRoutes.get(
    "/me/preferences",
    isAuthenticated,
    getMyPreferences,
    errorHandler,
);

usersRoutes.patch(
    "/me/preferences",
    isAuthenticated,
    patchMyPreferences,
    errorHandler,
);

usersRoutes.delete(
    "/me",
    isAuthenticated,
    requireRecentReauth(),
    deleteMe,
    errorHandler,
);

usersRoutes.post(
    "/me/change-password",
    isAuthenticated,
    requireRecentReauth(),
    changeMyPassword,
    errorHandler,
);

module.exports = { usersRoutes };

// usersRoutes.get(
//     "/admin",
//     isAuthenticated,
//     hasRole("admin"),
//     adminProfile,
//     errorHandler
// );
