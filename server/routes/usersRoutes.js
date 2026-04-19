// routes/usersRoutes.js

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
    requestCurrentEmailConfirmation,
    requestEmailChange,
    confirmEmail,
    unlinkMyGoogle,
    requestPasswordReset,
    resetPassword,
    getMyAssemblyConnections,
    createAssemblyConnection,
    updateAssemblyConnection,
    deleteAssemblyConnection,
    setDefaultAssemblyConnection,
} = require("../middlewares/usersRoutesHandler");
const errorHandler = require("../middlewares/errorHandler");
const {
    validateSignupRules,
    validationLoginRules,
    validateForgotPasswordRules,
    validateResetPasswordRules,
    handleValidationErrors,
} = require("../middlewares/validationMiddleware");
const { loginLimiter } = require("../middlewares/rateLimiters");

const {
    isAuthenticated,
    requireRecentReauth,
} = require("../middlewares/authMiddleware");
const { hasRole } = require("../middlewares/roleMiddleware");

usersRoutes.post(
    "/signup",
    loginLimiter,
    validateSignupRules,
    handleValidationErrors,
    createUsers,
    errorHandler,
);

usersRoutes.post(
    "/login",
    loginLimiter,
    validationLoginRules,
    handleValidationErrors,
    userLogin,
    errorHandler,
);

usersRoutes.post(
    "/forgot-password",
    loginLimiter,
    validateForgotPasswordRules,
    handleValidationErrors,
    requestPasswordReset,
    errorHandler,
);

usersRoutes.post(
    "/reset-password",
    loginLimiter,
    validateResetPasswordRules,
    handleValidationErrors,
    resetPassword,
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
    loginLimiter,
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

usersRoutes.get(
    "/me/assemblyai-connections",
    isAuthenticated,
    getMyAssemblyConnections,
    errorHandler,
);

usersRoutes.post(
    "/me/assemblyai-connections",
    isAuthenticated,
    requireRecentReauth(),
    createAssemblyConnection,
    errorHandler,
);

usersRoutes.patch(
    "/me/assemblyai-connections/:id",
    isAuthenticated,
    updateAssemblyConnection,
    errorHandler,
);

usersRoutes.delete(
    "/me/assemblyai-connections/:id",
    isAuthenticated,
    requireRecentReauth(),
    deleteAssemblyConnection,
    errorHandler,
);

usersRoutes.post(
    "/me/assemblyai-connections/:id/set-default",
    isAuthenticated,
    setDefaultAssemblyConnection,
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
    changeMyPassword,
    errorHandler,
);

usersRoutes.post(
    "/me/change-email",
    isAuthenticated,
    requireRecentReauth(),
    requestEmailChange,
    errorHandler,
);

usersRoutes.post(
    "/me/confirm-email/request",
    isAuthenticated,
    requestCurrentEmailConfirmation,
    errorHandler,
);

usersRoutes.post(
    "/me/unlink-google",
    isAuthenticated,
    requireRecentReauth(),
    unlinkMyGoogle,
    errorHandler,
);

usersRoutes.get("/confirm-email", confirmEmail, errorHandler);

module.exports = { usersRoutes };
