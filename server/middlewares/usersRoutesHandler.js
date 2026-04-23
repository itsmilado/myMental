// middlwares/usersRoutesHandler.js

require("dotenv").config();
const { compare } = require("bcryptjs");
const crypto = require("crypto");
const { hashPassword } = require("../utils/hashPass");
const { encryptSecret } = require("../utils/secretCrypto");
const logger = require("../utils/logger");
const pool = require("../db/db");
const loginCheck = require("../utils/loginCheck");
const { hasRecentReauth } = require("../middlewares/authMiddleware");
const { establishAuthenticatedSession } = require("../utils/sessionAuth");
const {
    createUserQuery,
    getUserByIdQuery,
    getAllUsersQuery,
    getUserByEmailQuery,
    updateUserByIdQuery,
    getUserPreferencesByIdQuery,
    updateUserPreferencesByIdQuery,
    updateUserPasswordByIdQuery,
    setPendingEmailChangeQuery,
    setPasswordResetTokenByIdQuery,
    getUserByPasswordResetTokenHashQuery,
    clearPasswordResetTokenByIdQuery,
    unlinkGoogleByIdQuery,
    confirmEmailByTokenHashQuery,
    setEmailConfirmationTokenByIdQuery,
} = require("../db/usersQueries");
const {
    getUserApiKeysQuery,
    getUserApiKeyByIdQuery,
    createUserApiKeyQuery,
    updateUserApiKeyQuery,
    setDefaultUserApiKeyQuery,
    deleteUserApiKeyQuery,
    countUserApiKeysQuery,
} = require("../db/userApiKeysQueries");
const {
    deleteTranscriptionTxtFile,
    deleteAudioFileCopy,
} = require("../utils/fileProcessor");
const { mergePreferences } = require("../utils/preferencesDefaults");
const { sendEmail } = require("../utils/mailer");
const { validateAssemblyApiKey } = require("../utils/assemblyaiClient");

const createUsers = async (request, response, next) => {
    try {
        // Filter sensitive fields from the request body before logging
        const filteredBody = filterSensitiveFields(request.body, [
            "password",
            "repeat_password",
        ]);

        const { password, user_role } = request.body;
        const hashed_password = await hashPassword(password);
        const newUser = await createUserQuery({
            ...request.body,
            hashed_password,
            user_role: user_role || "user", // Set user_role to "user" if it is not provided
        });

        logger.info(
            `[usersRoutesHandler.createUsers] => create user: success | ${JSON.stringify(
                {
                    userId: newUser.id,
                },
            )}`,
        );

        await establishAuthenticatedSession(request, newUser);

        response.status(201).json({
            success: true,
            message: "User created successfully",
            userData: serializeUserInfo(newUser),
        });
    } catch (error) {
        logger.error(
            `[usersRoutesHandler.createUsers] => create user: failed | ${JSON.stringify(
                {
                    error: error.message,
                },
            )}`,
        );
        next(error);
    }
};

const userLogin = async (request, response, next) => {
    try {
        // Filter sensitive fields from the request body before logging
        const filteredBody = filterSensitiveFields(request.body, ["password"]);

        const matchUser = await loginCheck({ ...request.body });

        // wrong credentials
        if (!matchUser) {
            logger.warn(
                `[usersRoutesHandler.userLogin] => authenticate user: denied | ${JSON.stringify(
                    {
                        reason: "invalid_credentials",
                        email: request.body?.email || null,
                    },
                )}`,
            );

            response.status(401).json({
                success: false,
                message: "Email or Password is wrong!",
            });
            return false;
        }

        // google-only accounts
        if (matchUser?.blocked && matchUser?.reason === "google_only") {
            return response.status(401).json({
                success: false,
                message: "Please sign in with Google for this account.",
                reason: "google_only",
            });
        }

        logger.info(
            `[usersRoutesHandler.userLogin] => authenticate user: success | ${JSON.stringify(
                {
                    userId: matchUser.id,
                    role: matchUser.user_role,
                },
            )}`,
        );

        const rememberMe = Boolean(request.body?.rememberMe);

        await establishAuthenticatedSession(request, matchUser, { rememberMe });

        return response.status(201).json({
            success: true,
            message: "login success",
            userData: serializeUserInfo(matchUser),
        });
    } catch (error) {
        logger.error(
            `[usersRoutesHandler.userLogin] => authenticate user: failed | ${JSON.stringify(
                {
                    error: error.message,
                },
            )}`,
        );
        next(error);
    }
};

const userLoggedOut = async (request, response, next) => {
    try {
        request.session.destroy((error) => {
            if (error) {
                logger.error(
                    `[usersRoutesHandler.userLoggedOut] => destroy session: failed | ${JSON.stringify(
                        {
                            error: error.message,
                        },
                    )}`,
                );

                return next(error); // Pass the error to the error handler middleware
            }
            const isProd = process.env.NODE_ENV === "production";
            response.clearCookie("sessionId", {
                httpOnly: true,
                sameSite: "lax",
                secure: isProd, // true in production behind HTTPS
            }); // Clear the session cookie

            logger.info(
                `[usersRoutesHandler.userLoggedOut] => clear session cookie: success`,
            );

            response
                .status(200)
                .json({ success: true, message: "logout successfull" });
        });
    } catch (error) {
        logger.error(
            `[usersRoutesHandler.userLoggedOut] => logout user: failed | ${JSON.stringify(
                {
                    error: error.message,
                },
            )}`,
        );
        next(error);
    }
};

const getUserInfo = async (request, response, next) => {
    try {
        const user = await getUserByIdQuery({ ...request.params });
        if (!user) {
            response
                .status(404)
                .json({ success: false, message: "User not found" });
            return;
        }

        logger.info(
            `[usersRoutesHandler.getUserInfo] => fetch user by id: success | ${JSON.stringify(
                {
                    userId: user.id,
                },
            )}`,
        );

        response.status(200).json({
            success: true,
            message: "User found",
            data: serializeUserInfo(user),
        });
    } catch (error) {
        logger.error(
            `[usersRoutesHandler.getUserInfo] => fetch user by id: failed | ${JSON.stringify(
                {
                    error: error.message,
                    userId: request.params?.id || null,
                },
            )}`,
        );
        next(error);
    }
};

const getAllProfiles = async (request, response, next) => {
    try {
        const users = await getAllUsersQuery();
        if (!users) {
            response
                .status(404)
                .json({ success: false, message: "No users retrieved" });
            return;
        }

        logger.info(
            `[usersRoutesHandler.getAllProfiles] => fetch all profiles: success | ${JSON.stringify(
                {
                    count: Array.isArray(users) ? users.length : 0,
                },
            )}`,
        );

        response.status(200).json({
            success: true,
            message: "Users found",
            data: users.map((user) => serializeUserInfo(user)),
        });
    } catch (error) {
        logger.error(
            `[usersRoutesHandler.getAllProfiles] => fetch all profiles: failed | ${JSON.stringify(
                {
                    error: error.message,
                },
            )}`,
        );
        next(error);
    }
};

const getCurrentUser = async (request, response, next) => {
    try {
        // Check if there is a user in the session
        if (!request.session || !request.session.user) {
            return response.status(401).json({
                success: false,
                message: "Not authenticated",
            });
        }

        const { id } = request.session.user;

        const user = await getUserByIdQuery({ id });
        if (!user) {
            return response.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        logger.info(
            `[usersRoutesHandler.getCurrentUser] => fetch current user: success | ${JSON.stringify(
                {
                    userId: id,
                },
            )}`,
        );

        const userData = serializeUserInfo(user);

        return response.status(200).json({
            success: true,
            message: "User is authenticated",
            userData,
        });
    } catch (error) {
        logger.error(
            `[usersRoutesHandler.getCurrentUser] => fetch current user: failed | ${JSON.stringify(
                {
                    error: error.message,
                    sessionUserId: request.session?.user?.id || null,
                },
            )}`,
        );
        next(error);
    }
};

const updateCurrentUser = async (request, response, next) => {
    try {
        if (!request.session || !request.session.user) {
            logger.warn(
                `[usersRoutesHandler.updateCurrentUser] => authorize update current user: denied | ${JSON.stringify(
                    {
                        reason: "not_authenticated",
                    },
                )}`,
            );

            return response.status(401).json({
                success: false,
                message: "Not authenticated",
            });
        }

        const { id } = request.session.user;

        const { first_name, last_name, email } = request.body || {};

        if (email !== undefined) {
            return response.status(400).json({
                success: false,
                message:
                    "Email changes require verification. Use /users/me/change-email.",
            });
        }

        if (first_name === undefined && last_name === undefined) {
            logger.warn(
                `[usersRoutesHandler.updateCurrentUser] => validate update payload: denied | ${JSON.stringify(
                    {
                        sessionUserId: id,
                        reason: "no_fields_provided",
                    },
                )}`,
            );

            return response.status(400).json({
                success: false,
                message: "No fields provided to update",
            });
        }

        if (first_name !== undefined && !isValidName(first_name)) {
            logger.warn(
                `[usersRoutesHandler.updateCurrentUser] => validate update payload: denied | ${JSON.stringify(
                    {
                        sessionUserId: id,
                        field: "first_name",
                    },
                )}`,
            );

            return response.status(400).json({
                success: false,
                message: "Invalid first name",
            });
        }

        if (last_name !== undefined && !isValidName(last_name)) {
            logger.warn(
                `[usersRoutesHandler.updateCurrentUser] => validate update payload: denied | ${JSON.stringify(
                    {
                        sessionUserId: id,
                        field: "last_name",
                    },
                )}`,
            );

            return response.status(400).json({
                success: false,
                message: "Invalid last name",
            });
        }

        if (email !== undefined && !isValidEmail(email)) {
            return response.status(400).json({
                success: false,
                message: "Invalid email",
            });
        }

        // Email uniqueness check (only if changing email)
        if (email !== undefined) {
            const existing = await getUserByEmailQuery({ email: email.trim() });
            // Only return error if email exists and belongs to a different user
            if (existing && String(existing.id) !== String(id)) {
                logger.warn(
                    `[usersRoutesHandler.updateCurrentUser] => validate email uniqueness: denied | ${JSON.stringify(
                        {
                            sessionUserId: id,
                            email,
                        },
                    )}`,
                );

                return response.status(409).json({
                    success: false,
                    message: "Email already in use",
                });
            }
        }

        const updatedUser = await updateUserByIdQuery({
            id,
            first_name: first_name?.trim(),
            last_name: last_name?.trim(),
            email: email?.trim(),
        });

        if (!updatedUser) {
            return response.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        const userData = serializeUserInfo(updatedUser);

        // Keep session email in sync (prevents stale session display)
        request.session.user.email = userData.email;

        logger.info(
            `[usersRoutesHandler.updateCurrentUser] => update current user: success | ${JSON.stringify(
                {
                    userId: updatedUser.id,
                },
            )}`,
        );

        return response.status(200).json({
            success: true,
            message: "Profile updated",
            userData,
        });
    } catch (error) {
        logger.error(
            `[usersRoutesHandler.updateCurrentUser] => update current user: failed | ${JSON.stringify(
                {
                    error: error.message,
                    sessionUserId: request.session?.user?.id || null,
                },
            )}`,
        );
        next(error);
    }
};

const getMyPreferences = async (request, response, next) => {
    try {
        const user = request.session?.user;
        if (!user?.id) {
            logger.warn(
                `[usersRoutesHandler.getMyPreferences] => authorize fetch preferences: denied | ${JSON.stringify(
                    {
                        reason: "missing_session_user",
                    },
                )}`,
            );

            return response
                .status(401)
                .json({ success: false, message: "Unauthorized" });
        }

        const stored = await getUserPreferencesByIdQuery({ id: user.id });
        const merged = mergePreferences(stored);

        logger.info(
            `[usersRoutesHandler.getMyPreferences] => fetch preferences: success | ${JSON.stringify(
                {
                    userId: user.id,
                },
            )}`,
        );

        return response.status(200).json({
            success: true,
            message: "Preferences loaded",
            preferences: merged,
        });
    } catch (error) {
        logger.error(
            `[usersRoutesHandler.getMyPreferences] => fetch preferences: failed | ${JSON.stringify(
                {
                    error: error.message,
                    sessionUserId: request.session?.user?.id || null,
                },
            )}`,
        );
        next(error);
    }
};

// shallow merge patch at section level (appearance/transcription/ai)
const patchMyPreferences = async (request, response, next) => {
    try {
        const user = request.session?.user;
        if (!user?.id) {
            logger.warn(
                `[usersRoutesHandler.patchMyPreferences] => authorize update preferences: denied | ${JSON.stringify(
                    {
                        reason: "missing_session_user",
                    },
                )}`,
            );

            return response
                .status(401)
                .json({ success: false, message: "Unauthorized" });
        }

        const patch = request.body || {};
        if (typeof patch !== "object" || Array.isArray(patch)) {
            logger.warn(
                `[usersRoutesHandler.patchMyPreferences] => validate preferences payload: denied | ${JSON.stringify(
                    {
                        sessionUserId: request.session?.user?.id || null,
                        reason: "invalid_payload",
                    },
                )}`,
            );

            return response
                .status(400)
                .json({ success: false, message: "Invalid payload" });
        }

        // Load + merge defaults first
        const stored = await getUserPreferencesByIdQuery({ id: user.id });
        const current = mergePreferences(stored);

        // Apply patch (only known top-level keys)
        const nextPrefs = {
            ...current,
            appearance: patch.appearance
                ? { ...current.appearance, ...patch.appearance }
                : current.appearance,
            transcription: patch.transcription
                ? { ...current.transcription, ...patch.transcription }
                : current.transcription,
            ai: patch.ai ? { ...current.ai, ...patch.ai } : current.ai,
            schemaVersion: current.schemaVersion,
        };

        const saved = await updateUserPreferencesByIdQuery({
            id: user.id,
            preferences: nextPrefs,
        });

        logger.info(
            `[usersRoutesHandler.patchMyPreferences] => update preferences: success | ${JSON.stringify(
                {
                    userId: user.id,
                },
            )}`,
        );

        return response.status(200).json({
            success: true,
            message: "Preferences updated",
            preferences: mergePreferences(saved),
        });
    } catch (error) {
        logger.error(
            `[usersRoutesHandler.patchMyPreferences] => update preferences: failed | ${JSON.stringify(
                {
                    error: error.message,
                    sessionUserId: request.session?.user?.id || null,
                },
            )}`,
        );
        next(error);
    }
};

const REAUTH_WINDOW_MS = 1000 * 60 * 5; // 5 minutes (tweakable)

/*
- purpose: re-authenticate the current session with password when password sign-in is enabled
- inputs: authenticated session and request body containing password
- outputs: short-lived reauthentication timestamp in the session
- important behavior:
 - rejects password reauth for accounts without a stored password
 - allows password reauth for both password-only and dual-auth accounts
*/
const reauthCurrentUser = async (request, response, next) => {
    try {
        const sessionUser = request.session?.user;
        if (!sessionUser?.id) {
            logger.warn(
                `[usersRoutesHandler.reauthCurrentUser] => authorize reauthenticate user: denied | ${JSON.stringify(
                    {
                        reason: "missing_session_user",
                    },
                )}`,
            );
            return response.status(401).json({
                success: false,
                message: "Unauthorized access. Please log in.",
            });
        }

        const { password } = request.body || {};
        if (!password || typeof password !== "string" || password.length < 1) {
            logger.warn(
                `[usersRoutesHandler.reauthCurrentUser] => validate reauth payload: denied | ${JSON.stringify(
                    {
                        sessionUserId: sessionUser?.id || null,
                        reason: "missing_password",
                    },
                )}`,
            );
            return response.status(400).json({
                success: false,
                message: "Password is required.",
            });
        }

        const user = await getUserByIdQuery({ id: sessionUser.id });
        if (!user) {
            return response.status(404).json({
                success: false,
                message: "User not found.",
            });
        }

        // Reject password reauth when password sign-in is not enabled
        if (!user.hashed_password) {
            logger.warn(
                `[usersRoutesHandler.reauthCurrentUser] => validate reauth method: denied | ${JSON.stringify(
                    {
                        sessionUserId: sessionUser.id,
                        reason: "password_auth_unavailable",
                    },
                )}`,
            );
            return response.status(400).json({
                success: false,
                message:
                    "This account does not have password sign-in enabled. Please continue with Google to verify your identity.",
            });
        }

        const ok = await compare(password, user.hashed_password);
        if (!ok) {
            logger.warn(
                `[usersRoutesHandler.reauthCurrentUser] => reauthenticate user: denied | ${JSON.stringify(
                    {
                        sessionUserId: sessionUser.id,
                        reason: "invalid_password",
                    },
                )}`,
            );
            return response.status(401).json({
                success: false,
                message: "Password is incorrect.",
            });
        }

        const now = Date.now();
        request.session.reauthenticatedAt = now;

        return request.session.save((err) => {
            if (err) return next(err);

            logger.info(
                `[usersRoutesHandler.reauthCurrentUser] => reauthenticate user: success | ${JSON.stringify(
                    {
                        userId: sessionUser.id,
                        reauthenticatedAt: now,
                    },
                )}`,
            );
            return response.status(200).json({
                success: true,
                message: "Re-authenticated.",
                reauthenticatedAt: now,
                validForMs: REAUTH_WINDOW_MS,
            });
        });
    } catch (error) {
        logger.error(
            `[usersRoutesHandler.reauthCurrentUser] => reauthenticate user: failed | ${JSON.stringify(
                {
                    error: error.message,
                    sessionUserId: request.session?.user?.id || null,
                },
            )}`,
        );
        next(error);
    }
};

/*
- purpose: remove Google sign-in from the authenticated user's account
- inputs: authenticated session user
- outputs: updated user payload without Google linkage
- important behavior:
 - blocks unlinking when password sign-in is not enabled, preventing the account from losing its only login method
 - allows unlinking for dual-auth accounts that already have a real password
*/
const unlinkMyGoogle = async (request, response, next) => {
    try {
        const sessionUser = request.session?.user;
        if (!sessionUser?.id) {
            logger.warn(
                `[usersRoutesHandler.unlinkMyGoogle] => authorize unlink google auth: denied | ${JSON.stringify(
                    {
                        reason: "not_authenticated",
                    },
                )}`,
            );
            return response.status(401).json({
                success: false,
                message: "Not authenticated.",
            });
        }

        const user = await getUserByIdQuery({ id: sessionUser.id });
        if (!user) {
            logger.warn(
                `[usersRoutesHandler.unlinkMyGoogle] => load unlink google user: denied | ${JSON.stringify(
                    {
                        sessionUserId: sessionUser?.id || null,
                    },
                )}`,
            );
            return response.status(404).json({
                success: false,
                message: "User not found.",
            });
        }

        if (!user.google_sub) {
            logger.warn(
                `[usersRoutesHandler.unlinkMyGoogle] => validate google linkage: denied | ${JSON.stringify(
                    {
                        userId: user.id,
                        reason: "google_not_linked",
                    },
                )}`,
            );
            return response.status(400).json({
                success: false,
                message: "Google sign-in is not linked to this account.",
            });
        }

        // Prevent removing the only available sign-in method
        if (!user.hashed_password) {
            logger.warn(
                `[usersRoutesHandler.unlinkMyGoogle] => validate unlink google auth: denied | ${JSON.stringify(
                    {
                        userId: user.id,
                        reason: "password_required_before_unlink",
                    },
                )}`,
            );
            return response.status(400).json({
                success: false,
                message:
                    "A password must be set before removing Google sign-in.",
            });
        }

        const updated = await unlinkGoogleByIdQuery({ id: user.id });
        request.session.reauthenticatedAt = null;

        logger.info(
            `[usersRoutesHandler.unlinkMyGoogle] => unlink google auth: success | ${JSON.stringify(
                {
                    userId: updated.id,
                },
            )}`,
        );
        return response.status(200).json({
            success: true,
            message: "Google sign-in removed successfully.",
            userData: serializeUserInfo(updated),
        });
    } catch (error) {
        logger.error(
            `[usersRoutesHandler.unlinkMyGoogle] => unlink google auth: failed | ${JSON.stringify(
                {
                    error: error.message,
                    sessionUserId: request.session?.user?.id || null,
                },
            )}`,
        );
        next(error);
    }
};

const deleteMe = async (request, response, next) => {
    const sessionUser = request.session?.user;

    if (!sessionUser?.id) {
        logger.warn(
            `[usersRoutesHandler.deleteMe] => authorize delete account: denied | ${JSON.stringify(
                {
                    reason: "missing_session_user",
                },
            )}`,
        );
        return response.status(401).json({
            success: false,
            message: "Unauthorized access. Please log in.",
        });
    }

    const userId = sessionUser.id;

    let client;
    let deletedFileNames = [];

    try {
        client = await pool.connect();

        await client.query("BEGIN");

        // Delete transcriptions (RETURN file_name for cleanup)
        const transRes = await client.query(
            `
            DELETE FROM transcriptions
            WHERE user_id = $1
            RETURNING file_name;
            `,
            [userId],
        );

        deletedFileNames = (transRes.rows || [])
            .map((r) => r.file_name)
            .filter(Boolean);

        // Delete backups
        await client.query(
            `
            DELETE FROM transcription_backups
            WHERE user_id = $1;
            `,
            [userId],
        );

        // Delete user
        const userRes = await client.query(
            `
            DELETE FROM users
            WHERE id = $1
            RETURNING id;
            `,
            [userId],
        );

        if (!userRes.rows?.length) {
            // If user didn't exist, rollback so we don't delete data for a non-existing user
            await client.query("ROLLBACK");
            return response.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        await client.query("COMMIT");
    } catch (error) {
        if (client) {
            try {
                await client.query("ROLLBACK");
            } catch (rollbackErr) {
                logger.error(
                    `[usersRoutesHandler.deleteMe] => rollback account deletion: failed | ${JSON.stringify(
                        {
                            error: rollbackErr.message,
                            userId,
                        },
                    )}`,
                );
            }
        }

        logger.error(
            `[usersRoutesHandler.deleteMe] => delete account transaction: failed | ${JSON.stringify(
                {
                    error: error.message,
                    userId,
                },
            )}`,
        );
        return next(error);
    } finally {
        if (client) client.release();
    }

    // file cleanup AFTER commit (outside transaction)
    const uniqueFileNames = Array.from(new Set(deletedFileNames));

    for (const fileName of uniqueFileNames) {
        try {
            deleteTranscriptionTxtFile(fileName);
        } catch (e) {
            logger.warn(
                `[usersRoutesHandler.deleteMe] => delete transcription text cleanup: failed | ${JSON.stringify(
                    {
                        userId,
                        fileName,
                        error: e.message,
                    },
                )}`,
            );
        }

        try {
            deleteAudioFileCopy(fileName);
        } catch (e) {
            logger.warn(
                `[usersRoutesHandler.deleteMe] => delete audio cleanup: failed | ${JSON.stringify(
                    {
                        userId,
                        fileName,
                        error: e.message,
                    },
                )}`,
            );
        }
    }

    // Destroy session + clear cookie
    request.session.destroy((err) => {
        if (err) {
            logger.error(
                `[usersRoutesHandler.deleteMe] => destroy deleted-user session: failed | ${JSON.stringify(
                    {
                        userId,
                        error: err.message,
                    },
                )}`,
            );
            // Account is already deleted; return success but warn.
            response.clearCookie("sessionId");
            return response.status(200).json({
                success: true,
                message:
                    "Account deleted (session cleanup had a minor issue, please refresh).",
            });
        }

        logger.info(
            `[usersRoutesHandler.deleteMe] => delete account: success | ${JSON.stringify(
                {
                    userId,
                    deletedFileCount: uniqueFileNames.length,
                },
            )}`,
        );
        response.clearCookie("sessionId");
        return response.status(200).json({
            success: true,
            message: "Account deleted",
        });
    });
};

/*
- purpose: create or update the authenticated user's password
- inputs: request body with new_password and optional current_password
- outputs: success response with updated user auth capabilities
- important behavior:
  - allows initial password setup when the account has no password yet
  - requires current password when password sign-in already exists
  - returns refreshed user auth state so the client can switch from Google-only to dual-auth immediately
*/
const changeMyPassword = async (request, response, next) => {
    try {
        const sessionUser = request.session?.user;
        if (!sessionUser?.id) {
            logger.warn(
                `[usersRoutesHandler.changeMyPassword] => authorize change password: denied | ${JSON.stringify(
                    {
                        reason: "missing_session_user",
                    },
                )}`,
            );
            return response.status(401).json({
                success: false,
                message: "Unauthorized access. Please log in.",
            });
        }

        const { current_password, new_password } = request.body || {};

        if (
            !new_password ||
            typeof new_password !== "string" ||
            new_password.trim().length < 6
        ) {
            logger.warn(
                `[usersRoutesHandler.changeMyPassword] => validate password payload: denied | ${JSON.stringify(
                    {
                        sessionUserId: sessionUser?.id || null,
                        reason: "invalid_new_password",
                    },
                )}`,
            );
            return response.status(400).json({
                success: false,
                message: "New password must be at least 6 characters",
            });
        }

        const user = await getUserByIdQuery({ id: sessionUser.id });
        if (!user) {
            logger.warn(
                `[usersRoutesHandler.changeMyPassword] => load password user: denied | ${JSON.stringify(
                    {
                        sessionUserId: sessionUser.id,
                    },
                )}`,
            );
            return response.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        const hasPassword = Boolean(user.hashed_password);

        if (hasPassword) {
            // Require current password when password auth is already enabled
            if (
                !current_password ||
                typeof current_password !== "string" ||
                !current_password.trim()
            ) {
                logger.warn(
                    `[usersRoutesHandler.changeMyPassword] => validate current password payload: denied | ${JSON.stringify(
                        {
                            sessionUserId: sessionUser.id,
                            reason: "missing_current_password",
                        },
                    )}`,
                );
                return response.status(400).json({
                    success: false,
                    message: "Current password is required.",
                });
            }

            const matchesCurrent = await compare(
                current_password,
                user.hashed_password,
            );

            if (!matchesCurrent) {
                logger.warn(
                    `[usersRoutesHandler.changeMyPassword] => verify current password: denied | ${JSON.stringify(
                        {
                            sessionUserId: sessionUser.id,
                            reason: "incorrect_current_password",
                        },
                    )}`,
                );
                return response.status(401).json({
                    success: false,
                    message: "Current password is incorrect.",
                });
            }

            // Prevent reusing the existing password
            const isSame = await compare(new_password, user.hashed_password);
            if (isSame) {
                logger.warn(
                    `[usersRoutesHandler.changeMyPassword] => validate new password reuse: denied | ${JSON.stringify(
                        {
                            sessionUserId: sessionUser.id,
                        },
                    )}`,
                );
                return response.status(400).json({
                    success: false,
                    message:
                        "New password must be different from the current one",
                });
            }
        }

        const hashed_password = await hashPassword(new_password);

        const updated = await updateUserPasswordByIdQuery({
            id: sessionUser.id,
            hashed_password,
        });

        if (!updated) {
            return response.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        logger.info(
            `[usersRoutesHandler.changeMyPassword] => change password: success | ${JSON.stringify(
                {
                    userId: updated.id,
                    action: hasPassword ? "updated" : "created",
                },
            )}`,
        );
        return response.status(200).json({
            success: true,
            message: hasPassword ? "Password updated" : "Password created",
            userData: serializeUserInfo(updated),
        });
    } catch (error) {
        logger.error(
            `[usersRoutesHandler.changeMyPassword] => change password: failed | ${JSON.stringify(
                {
                    error: error.message,
                    sessionUserId: request.session?.user?.id || null,
                },
            )}`,
        );
        next(error);
    }
};

const requestCurrentEmailConfirmation = async (request, response, next) => {
    try {
        const sessionUser = request.session?.user;
        if (!sessionUser?.id) {
            logger.warn(
                `[usersRoutesHandler.requestCurrentEmailConfirmation] => authorize current email confirmation: denied | ${JSON.stringify(
                    {
                        reason: "not_authenticated",
                    },
                )}`,
            );
            return response.status(401).json({
                success: false,
                message: "Not authenticated.",
            });
        }

        const user = await getUserByIdQuery({ id: sessionUser.id });
        if (!user) {
            logger.warn(
                `[usersRoutesHandler.requestCurrentEmailConfirmation] => load confirmation user: denied | ${JSON.stringify(
                    {
                        sessionUserId: sessionUser?.id || null,
                    },
                )}`,
            );
            return response.status(404).json({
                success: false,
                message: "User not found.",
            });
        }

        if (user.pending_email) {
            logger.warn(
                `[usersRoutesHandler.requestCurrentEmailConfirmation] => validate current email confirmation state: denied | ${JSON.stringify(
                    {
                        userId: user.id,
                        reason: "pending_email_exists",
                    },
                )}`,
            );
            return response.status(409).json({
                success: false,
                message:
                    "Finish confirming your pending email change before confirming your current email again.",
            });
        }

        if (user.isconfirmed) {
            logger.info(
                `[usersRoutesHandler.requestCurrentEmailConfirmation] => request current email confirmation: skipped | ${JSON.stringify(
                    {
                        userId: user.id,
                        reason: "already_confirmed",
                    },
                )}`,
            );
            return response.status(200).json({
                success: true,
                message: "Your current email is already confirmed.",
            });
        }

        const { token, token_hash, expires_at } = createEmailToken();

        await setEmailConfirmationTokenByIdQuery({
            id: user.id,
            token_hash,
            expires_at,
        });

        const confirmUrl = buildConfirmEmailUrl(token);

        await sendEmail({
            to: user.email,
            subject: "Confirm your email for myMental",
            text: `Confirm your email by opening this link: ${confirmUrl}`,
            html: `
                <p>Please confirm your email by clicking the link below:</p>
                <p><a href="${confirmUrl}">Confirm email</a></p>
                <p>This link expires in 24 hours.</p>
            `,
        });

        logger.info(
            `[usersRoutesHandler.requestCurrentEmailConfirmation] => request current email confirmation: success | ${JSON.stringify(
                {
                    userId: user.id,
                },
            )}`,
        );
        return response.status(200).json({
            success: true,
            message: "Confirmation email sent to your current email address.",
        });
    } catch (error) {
        logger.error(
            `[usersRoutesHandler.requestCurrentEmailConfirmation] => request current email confirmation: failed | ${JSON.stringify(
                {
                    error: error.message,
                    sessionUserId: request.session?.user?.id || null,
                },
            )}`,
        );
        next(error);
    }
};

const requestEmailChange = async (request, response, next) => {
    try {
        const sessionUser = request.session?.user;
        if (!sessionUser?.id) {
            logger.warn(
                `[usersRoutesHandler.requestEmailChange] => authorize email change: denied | ${JSON.stringify(
                    {
                        reason: "not_authenticated",
                    },
                )}`,
            );
            return response.status(401).json({
                success: false,
                message: "Not authenticated.",
            });
        }

        const user = await getUserByIdQuery({ id: sessionUser.id });
        if (!user) {
            logger.warn(
                `[usersRoutesHandler.requestEmailChange] => load email change user: denied | ${JSON.stringify(
                    {
                        sessionUserId: sessionUser.id,
                    },
                )}`,
            );
            return response.status(404).json({
                success: false,
                message: "User not found.",
            });
        }

        const newEmailRaw = request.body?.new_email;
        if (!newEmailRaw || !isValidEmail(newEmailRaw)) {
            logger.warn(
                `[usersRoutesHandler.requestEmailChange] => validate new email payload: denied | ${JSON.stringify(
                    {
                        sessionUserId: sessionUser?.id || null,
                        reason: "invalid_new_email",
                    },
                )}`,
            );
            return response.status(400).json({
                success: false,
                message: "Enter a valid email address.",
            });
        }

        const new_email = String(newEmailRaw).trim().toLowerCase();

        if (new_email === String(user.email).trim().toLowerCase()) {
            logger.warn(
                `[usersRoutesHandler.requestEmailChange] => validate new email uniqueness: denied | ${JSON.stringify(
                    {
                        userId: user.id,
                        reason: "same_as_current_email",
                    },
                )}`,
            );
            return response.status(400).json({
                success: false,
                message: "Enter a different email address.",
            });
        }

        if (user.pending_email && user.pending_email !== new_email) {
            return response.status(409).json({
                success: false,
                message:
                    "You already have a pending email change. Confirm it first before starting another one.",
            });
        }

        const existing = await getUserByEmailQuery({ email: new_email });
        if (existing && String(existing.id) !== String(sessionUser.id)) {
            logger.warn(
                `[usersRoutesHandler.requestEmailChange] => validate new email uniqueness: denied | ${JSON.stringify(
                    {
                        userId: user.id,
                        reason: "email_already_in_use",
                    },
                )}`,
            );
            return response.status(409).json({
                success: false,
                message: "That email is already in use.",
            });
        }

        const { token, token_hash, expires_at } = createEmailToken();

        await setPendingEmailChangeQuery({
            id: sessionUser.id,
            pending_email: new_email,
            token_hash,
            expires_at,
        });

        const confirmUrl = buildConfirmEmailUrl(token);

        await sendEmail({
            to: new_email,
            subject: "Confirm your new email for myMental",
            text: `Confirm your email change by opening this link: ${confirmUrl}`,
            html: `
                <p>Confirm your new email address by clicking the link below:</p>
                <p><a href="${confirmUrl}">Confirm email change</a></p>
                <p>This link expires in 24 hours.</p>
            `,
        });

        logger.info(
            `[usersRoutesHandler.requestEmailChange] => request email change: success | ${JSON.stringify(
                {
                    userId: user.id,
                    pendingEmail: new_email,
                },
            )}`,
        );
        return response.status(200).json({
            success: true,
            message: "Confirmation email sent to your new email address.",
            pending_email: new_email,
        });
    } catch (error) {
        logger.error(
            `[usersRoutesHandler.requestEmailChange] => request email change: failed | ${JSON.stringify(
                {
                    error: error.message,
                    sessionUserId: request.session?.user?.id || null,
                },
            )}`,
        );
        next(error);
    }
};

const confirmEmail = async (request, response, next) => {
    try {
        const token = String(request.query?.token || "").trim();
        if (!token) {
            logger.warn(
                `[usersRoutesHandler.confirmEmail] => validate confirmation token: denied | ${JSON.stringify(
                    {
                        reason: "missing_token",
                    },
                )}`,
            );
            return response.status(400).json({
                success: false,
                message: "Missing confirmation token.",
            });
        }

        const token_hash = crypto
            .createHash("sha256")
            .update(token)
            .digest("hex");

        const updated = await confirmEmailByTokenHashQuery({ token_hash });

        if (!updated) {
            logger.warn(
                `[usersRoutesHandler.confirmEmail] => confirm email: denied | ${JSON.stringify(
                    {
                        reason: "invalid_or_expired_token",
                    },
                )}`,
            );
            return response.status(400).json({
                success: false,
                message: "This confirmation link is invalid or has expired.",
            });
        }

        if (
            request.session?.user?.id &&
            String(request.session.user.id) === String(updated.id)
        ) {
            request.session.user.email = updated.email;
        }

        logger.info(
            `[usersRoutesHandler.confirmEmail] => confirm email: success | ${JSON.stringify(
                {
                    userId: updated.id,
                    sessionSynced:
                        request.session?.user?.id &&
                        String(request.session.user.id) === String(updated.id),
                },
            )}`,
        );
        return response.status(200).json({
            success: true,
            message: "Email confirmed successfully.",
            userData: serializeUserInfo(updated),
        });
    } catch (error) {
        logger.error(
            `[usersRoutesHandler.confirmEmail] => confirm email: failed | ${JSON.stringify(
                {
                    error: error.message,
                },
            )}`,
        );
        next(error);
    }
};

const requestPasswordReset = async (request, response, next) => {
    try {
        const emailRaw = request.body?.email;

        // Keep generic success response to prevent account enumeration
        const genericResponse = () =>
            response.status(200).json({
                success: true,
                message:
                    "If an account exists for that email, a password reset link has been sent.",
            });

        if (!emailRaw || !isValidEmail(emailRaw)) {
            // Still return generic success to avoid enumeration via validation
            logger.info(
                `[usersRoutesHandler.requestPasswordReset] => request password reset: completed | ${JSON.stringify(
                    {
                        result: "generic_response",
                        reason: "missing_or_invalid_email",
                    },
                )}`,
            );
            return genericResponse();
        }

        const email = String(emailRaw).trim().toLowerCase();

        const user = await getUserByEmailQuery({ email });
        if (!user) {
            logger.info(
                `[usersRoutesHandler.requestPasswordReset] => request password reset: completed | ${JSON.stringify(
                    {
                        result: "generic_response",
                        email,
                        reason: "user_not_found",
                    },
                )}`,
            );
            return genericResponse();
        }

        const token = crypto.randomBytes(32).toString("hex");
        const token_hash = crypto
            .createHash("sha256")
            .update(token)
            .digest("hex");
        const expires_at = new Date(Date.now() + 1000 * 60 * 60); // 1 hour

        await setPasswordResetTokenByIdQuery({
            id: user.id,
            token_hash,
            expires_at,
        });

        const baseUrl = process.env.APP_ORIGIN || "http://localhost:3002";
        const resetUrl = `${baseUrl}/reset-password?token=${token}`;

        await sendEmail({
            to: email,
            subject: "Reset your myMental password",
            text: `Reset your password by opening this link: ${resetUrl}`,
            html: `
                <p>To reset your password, click the link below:</p>
                <p><a href="${resetUrl}">Reset password</a></p>
                <p>This link expires in 1 hour.</p>
            `,
        });

        logger.info(
            `[usersRoutesHandler.requestPasswordReset] => request password reset: success | ${JSON.stringify(
                {
                    userId: user.id,
                    email,
                },
            )}`,
        );
        return genericResponse();
    } catch (error) {
        logger.error(
            `[usersRoutesHandler.requestPasswordReset] => request password reset: failed | ${JSON.stringify(
                {
                    error: error.message,
                },
            )}`,
        );
        next(error);
    }
};

const resetPassword = async (request, response, next) => {
    try {
        const token = String(request.body?.token || "").trim();
        const new_password = String(request.body?.new_password || "");

        if (!token || !new_password) {
            logger.warn(
                `[usersRoutesHandler.resetPassword] => validate reset payload: denied | ${JSON.stringify(
                    {
                        reason: "missing_token_or_new_password",
                        hasToken: Boolean(token),
                        hasNewPassword: Boolean(new_password),
                    },
                )}`,
            );
            return response.status(400).json({
                success: false,
                message: "Token and new password are required",
            });
        }

        const token_hash = crypto
            .createHash("sha256")
            .update(token)
            .digest("hex");

        const user = await getUserByPasswordResetTokenHashQuery({ token_hash });
        if (!user) {
            logger.warn(
                `[usersRoutesHandler.resetPassword] => reset password: denied | ${JSON.stringify(
                    {
                        reason: "invalid_or_expired_token",
                    },
                )}`,
            );
            return response.status(400).json({
                success: false,
                message: "Invalid or expired reset token",
            });
        }

        const expiresAt = user.password_reset_expires_at
            ? new Date(user.password_reset_expires_at).getTime()
            : 0;

        if (!expiresAt || Date.now() > expiresAt) {
            // Clear stale token
            await clearPasswordResetTokenByIdQuery({ id: user.id });
            logger.warn(
                `[usersRoutesHandler.resetPassword] => reset password: denied | ${JSON.stringify(
                    {
                        userId: user.id,
                        reason: "expired_token_cleared",
                    },
                )}`,
            );
            return response.status(400).json({
                success: false,
                message: "Invalid or expired reset token",
            });
        }

        const hashed = await hashPassword(new_password);

        await updateUserPasswordByIdQuery({
            id: user.id,
            hashed_password: hashed,
        });

        await clearPasswordResetTokenByIdQuery({ id: user.id });

        logger.info(
            `[usersRoutesHandler.resetPassword] => reset password: success | ${JSON.stringify(
                {
                    userId: user.id,
                },
            )}`,
        );
        return response.status(200).json({
            success: true,
            message: "Password updated successfully",
        });
    } catch (error) {
        logger.error(
            `[usersRoutesHandler.resetPassword] => reset password: failed | ${JSON.stringify(
                {
                    error: error.message,
                },
            )}`,
        );
        next(error);
    }
};

const ASSEMBLYAI_PROVIDER = "assemblyai";
const MAX_CONNECTION_LABEL_LENGTH = 60;

const parsePositiveInteger = (value) => {
    const parsed = Number(value);

    if (!Number.isInteger(parsed) || parsed < 1) {
        return null;
    }

    return parsed;
};

const normalizeConnectionLabel = (value) => {
    if (typeof value !== "string") return "";
    return value.trim();
};

const normalizeApiKey = (value) => {
    if (typeof value !== "string") return "";
    return value.trim();
};

const serializeAssemblyConnection = (connection) => {
    return {
        id: connection.id,
        provider: connection.provider,
        label: connection.label,
        masked_key: `••••${connection.key_hint_last4}`,
        key_hint_last4: connection.key_hint_last4,
        is_default: Boolean(connection.is_default),
        status: connection.status,
        last_validated_at: connection.last_validated_at,
        created_at: connection.created_at,
        updated_at: connection.updated_at,
    };
};

const getMyAssemblyConnections = async (request, response, next) => {
    try {
        const sessionUser = request.session?.user;
        if (!sessionUser?.id) {
            logger.warn(
                `[usersRoutesHandler.getMyAssemblyConnections] => load assembly connections: denied | ${JSON.stringify(
                    {
                        reason: "missing_session_user",
                    },
                )}`,
            );
            return response.status(401).json({
                success: false,
                message: "Unauthorized access. Please log in.",
            });
        }

        const connections = await getUserApiKeysQuery({
            user_id: sessionUser.id,
            provider: ASSEMBLYAI_PROVIDER,
        });

        return response.status(200).json({
            success: true,
            message: "AssemblyAI connections loaded.",
            connections: connections.map(serializeAssemblyConnection),
        });
    } catch (error) {
        logger.error(
            `[usersRoutesHandler.getMyAssemblyConnections] => load assembly connections: failed | ${JSON.stringify(
                {
                    error: error.message,
                },
            )}`,
        );
        next(error);
    }
};

const createAssemblyConnection = async (request, response, next) => {
    try {
        const sessionUser = request.session?.user;
        if (!sessionUser?.id) {
            logger.warn(
                `[usersRoutesHandler.createAssemblyConnection] => create assembly connection: denied | ${JSON.stringify(
                    {
                        reason: "missing_session_user",
                    },
                )}`,
            );
            return response.status(401).json({
                success: false,
                message: "Unauthorized access. Please log in.",
            });
        }

        const label = normalizeConnectionLabel(request.body?.label);
        const apiKey = normalizeApiKey(request.body?.api_key);
        const wantsDefault = Boolean(request.body?.is_default);

        if (!label) {
            logger.warn(
                `[usersRoutesHandler.createAssemblyConnection] => validate connection label: denied | ${JSON.stringify(
                    {
                        userId: sessionUser.id,
                        reason: "missing_label",
                    },
                )}`,
            );
            return response.status(400).json({
                success: false,
                message: "Connection label is required.",
            });
        }

        if (label.length > MAX_CONNECTION_LABEL_LENGTH) {
            logger.warn(
                `[usersRoutesHandler.createAssemblyConnection] => validate connection label: denied | ${JSON.stringify(
                    {
                        userId: sessionUser.id,
                        reason: "label_too_long",
                    },
                )}`,
            );
            return response.status(400).json({
                success: false,
                message: `Connection label must be ${MAX_CONNECTION_LABEL_LENGTH} characters or fewer.`,
            });
        }

        if (!apiKey) {
            logger.warn(
                `[usersRoutesHandler.createAssemblyConnection] => validate api key: denied | ${JSON.stringify(
                    {
                        userId: sessionUser.id,
                        reason: "missing_api_key",
                    },
                )}`,
            );
            return response.status(400).json({
                success: false,
                message: "AssemblyAI API key is required.",
            });
        }

        const validation = await validateAssemblyApiKey(apiKey);
        if (!validation.valid) {
            logger.warn(
                `[usersRoutesHandler.createAssemblyConnection] => validate api key: denied | ${JSON.stringify(
                    {
                        userId: sessionUser.id,
                        reason: validation.message || "invalid_api_key",
                    },
                )}`,
            );
            return response.status(400).json({
                success: false,
                message: validation.message || "Invalid AssemblyAI API key.",
            });
        }

        const keyCount = await countUserApiKeysQuery({
            user_id: sessionUser.id,
            provider: ASSEMBLYAI_PROVIDER,
        });

        const created = await createUserApiKeyQuery({
            user_id: sessionUser.id,
            provider: ASSEMBLYAI_PROVIDER,
            label,
            encrypted_api_key: encryptSecret(apiKey),
            key_hint_last4: apiKey.slice(-4),
            is_default: false,
            status: "active",
            last_validated_at: new Date(),
        });

        const shouldSetDefault = keyCount === 0 || wantsDefault;

        const connection = shouldSetDefault
            ? await setDefaultUserApiKeyQuery({
                  id: created.id,
                  user_id: sessionUser.id,
                  provider: ASSEMBLYAI_PROVIDER,
              })
            : created;

        logger.info(
            `[usersRoutesHandler.createAssemblyConnection] => create assembly connection: success | ${JSON.stringify(
                {
                    userId: sessionUser.id,
                    resourceId: connection.id,
                },
            )}`,
        );

        return response.status(201).json({
            success: true,
            message: "AssemblyAI connection saved.",
            connection: serializeAssemblyConnection(connection),
        });
    } catch (error) {
        logger.error(
            `[usersRoutesHandler.createAssemblyConnection] => create assembly connection: failed | ${JSON.stringify(
                {
                    error: error.message,
                },
            )}`,
        );
        next(error);
    }
};

const updateAssemblyConnection = async (request, response, next) => {
    try {
        const sessionUser = request.session?.user;
        if (!sessionUser?.id) {
            logger.warn(
                `[usersRoutesHandler.updateAssemblyConnection] => update assembly connection: denied | ${JSON.stringify(
                    {
                        reason: "missing_session_user",
                    },
                )}`,
            );
            return response.status(401).json({
                success: false,
                message: "Unauthorized access. Please log in.",
            });
        }

        const connectionId = parsePositiveInteger(request.params?.id);
        if (!connectionId) {
            logger.warn(
                `[usersRoutesHandler.updateAssemblyConnection] => validate connection id: denied | ${JSON.stringify(
                    {
                        userId: sessionUser.id,
                        reason: "invalid_connection_id",
                    },
                )}`,
            );
            return response.status(400).json({
                success: false,
                message: "Invalid connection id.",
            });
        }

        const existing = await getUserApiKeyByIdQuery({
            id: connectionId,
            user_id: sessionUser.id,
            provider: ASSEMBLYAI_PROVIDER,
        });

        if (!existing) {
            logger.warn(
                `[usersRoutesHandler.updateAssemblyConnection] => load assembly connection: denied | ${JSON.stringify(
                    {
                        userId: sessionUser.id,
                        resourceId: connectionId,
                        reason: "connection_not_found",
                    },
                )}`,
            );
            return response.status(404).json({
                success: false,
                message: "AssemblyAI connection not found.",
            });
        }

        if (request.body?.is_default !== undefined) {
            logger.warn(
                `[usersRoutesHandler.updateAssemblyConnection] => update assembly connection: denied | ${JSON.stringify(
                    {
                        userId: sessionUser.id,
                        resourceId: connectionId,
                        reason: "default_change_not_allowed",
                    },
                )}`,
            );
            return response.status(400).json({
                success: false,
                message: "Use the set-default endpoint for default changes.",
            });
        }

        const hasLabelField = request.body?.label !== undefined;
        const hasApiKeyField = request.body?.api_key !== undefined;

        if (!hasLabelField && !hasApiKeyField) {
            logger.warn(
                `[usersRoutesHandler.updateAssemblyConnection] => update assembly connection: denied | ${JSON.stringify(
                    {
                        userId: sessionUser.id,
                        resourceId: connectionId,
                        reason: "missing_update_fields",
                    },
                )}`,
            );
            return response.status(400).json({
                success: false,
                message: "No fields provided to update.",
            });
        }

        let label;
        if (hasLabelField) {
            label = normalizeConnectionLabel(request.body?.label);

            if (!label) {
                logger.warn(
                    `[usersRoutesHandler.updateAssemblyConnection] => validate connection label: denied | ${JSON.stringify(
                        {
                            userId: sessionUser.id,
                            resourceId: connectionId,
                            reason: "empty_label",
                        },
                    )}`,
                );
                return response.status(400).json({
                    success: false,
                    message: "Connection label cannot be empty.",
                });
            }

            if (label.length > MAX_CONNECTION_LABEL_LENGTH) {
                logger.warn(
                    `[usersRoutesHandler.updateAssemblyConnection] => validate connection label: denied | ${JSON.stringify(
                        {
                            userId: sessionUser.id,
                            resourceId: connectionId,
                            reason: "label_too_long",
                        },
                    )}`,
                );
                return response.status(400).json({
                    success: false,
                    message: `Connection label must be ${MAX_CONNECTION_LABEL_LENGTH} characters or fewer.`,
                });
            }
        }

        let encryptedApiKey;
        let keyHintLast4;
        let status;
        let lastValidatedAt;

        if (hasApiKeyField) {
            if (!hasRecentReauth(request)) {
                logger.warn(
                    `[usersRoutesHandler.updateAssemblyConnection] => validate reauthentication: denied | ${JSON.stringify(
                        {
                            userId: sessionUser.id,
                            resourceId: connectionId,
                            reason: "missing_recent_reauth",
                        },
                    )}`,
                );
                return response.status(403).json({
                    success: false,
                    message: "Re-authentication required",
                });
            }

            const apiKey = normalizeApiKey(request.body?.api_key);

            if (!apiKey) {
                logger.warn(
                    `[usersRoutesHandler.updateAssemblyConnection] => validate api key: denied | ${JSON.stringify(
                        {
                            userId: sessionUser.id,
                            resourceId: connectionId,
                            reason: "empty_api_key",
                        },
                    )}`,
                );
                return response.status(400).json({
                    success: false,
                    message: "AssemblyAI API key cannot be empty.",
                });
            }

            const validation = await validateAssemblyApiKey(apiKey);
            if (!validation.valid) {
                logger.warn(
                    `[usersRoutesHandler.updateAssemblyConnection] => validate api key: denied | ${JSON.stringify(
                        {
                            userId: sessionUser.id,
                            resourceId: connectionId,
                            reason: validation.message || "invalid_api_key",
                        },
                    )}`,
                );
                return response.status(400).json({
                    success: false,
                    message:
                        validation.message || "Invalid AssemblyAI API key.",
                });
            }

            encryptedApiKey = encryptSecret(apiKey);
            keyHintLast4 = apiKey.slice(-4);
            status = "active";
            lastValidatedAt = new Date();
        }

        const updated = await updateUserApiKeyQuery({
            id: connectionId,
            user_id: sessionUser.id,
            label,
            encrypted_api_key: encryptedApiKey,
            key_hint_last4: keyHintLast4,
            status,
            last_validated_at: lastValidatedAt,
        });

        logger.info(
            `[usersRoutesHandler.updateAssemblyConnection] => update assembly connection: success | ${JSON.stringify(
                {
                    userId: sessionUser.id,
                    resourceId: connectionId,
                },
            )}`,
        );

        return response.status(200).json({
            success: true,
            message: "AssemblyAI connection updated.",
            connection: serializeAssemblyConnection(updated),
        });
    } catch (error) {
        logger.error(
            `[usersRoutesHandler.updateAssemblyConnection] => update assembly connection: failed | ${JSON.stringify(
                {
                    error: error.message,
                },
            )}`,
        );
        next(error);
    }
};

const deleteAssemblyConnection = async (request, response, next) => {
    try {
        const sessionUser = request.session?.user;
        if (!sessionUser?.id) {
            logger.warn(
                `[usersRoutesHandler.deleteAssemblyConnection] => delete assembly connection: denied | ${JSON.stringify(
                    {
                        reason: "missing_session_user",
                    },
                )}`,
            );
            return response.status(401).json({
                success: false,
                message: "Unauthorized access. Please log in.",
            });
        }

        const connectionId = parsePositiveInteger(request.params?.id);
        if (!connectionId) {
            logger.warn(
                `[usersRoutesHandler.deleteAssemblyConnection] => validate connection id: denied | ${JSON.stringify(
                    {
                        userId: sessionUser.id,
                        reason: "invalid_connection_id",
                    },
                )}`,
            );
            return response.status(400).json({
                success: false,
                message: "Invalid connection id.",
            });
        }

        const existing = await getUserApiKeyByIdQuery({
            id: connectionId,
            user_id: sessionUser.id,
            provider: ASSEMBLYAI_PROVIDER,
        });

        if (!existing) {
            logger.warn(
                `[usersRoutesHandler.deleteAssemblyConnection] => load assembly connection: denied | ${JSON.stringify(
                    {
                        userId: sessionUser.id,
                        resourceId: connectionId,
                        reason: "connection_not_found",
                    },
                )}`,
            );
            return response.status(404).json({
                success: false,
                message: "AssemblyAI connection not found.",
            });
        }

        const deleted = await deleteUserApiKeyQuery({
            id: connectionId,
            user_id: sessionUser.id,
            provider: ASSEMBLYAI_PROVIDER,
        });

        logger.info(
            `[usersRoutesHandler.deleteAssemblyConnection] => delete assembly connection: success | ${JSON.stringify(
                {
                    userId: sessionUser.id,
                    resourceId: connectionId,
                },
            )}`,
        );

        return response.status(200).json({
            success: true,
            message: "AssemblyAI connection removed.",
            connection: serializeAssemblyConnection(deleted),
        });
    } catch (error) {
        logger.error(
            `[usersRoutesHandler.deleteAssemblyConnection] => delete assembly connection: failed | ${JSON.stringify(
                {
                    error: error.message,
                },
            )}`,
        );
        next(error);
    }
};

const setDefaultAssemblyConnection = async (request, response, next) => {
    try {
        const sessionUser = request.session?.user;
        if (!sessionUser?.id) {
            logger.warn(
                `[usersRoutesHandler.setDefaultAssemblyConnection] => set default assembly connection: denied | ${JSON.stringify(
                    {
                        reason: "missing_session_user",
                    },
                )}`,
            );
            return response.status(401).json({
                success: false,
                message: "Unauthorized access. Please log in.",
            });
        }

        const connectionId = parsePositiveInteger(request.params?.id);
        if (!connectionId) {
            logger.warn(
                `[usersRoutesHandler.setDefaultAssemblyConnection] => validate connection id: denied | ${JSON.stringify(
                    {
                        userId: sessionUser.id,
                        reason: "invalid_connection_id",
                    },
                )}`,
            );
            return response.status(400).json({
                success: false,
                message: "Invalid connection id.",
            });
        }

        const existing = await getUserApiKeyByIdQuery({
            id: connectionId,
            user_id: sessionUser.id,
            provider: ASSEMBLYAI_PROVIDER,
        });

        if (!existing) {
            logger.warn(
                `[usersRoutesHandler.setDefaultAssemblyConnection] => load assembly connection: denied | ${JSON.stringify(
                    {
                        userId: sessionUser.id,
                        resourceId: connectionId,
                        reason: "connection_not_found",
                    },
                )}`,
            );
            return response.status(404).json({
                success: false,
                message: "AssemblyAI connection not found.",
            });
        }

        if (existing.status !== "active") {
            logger.warn(
                `[usersRoutesHandler.setDefaultAssemblyConnection] => set default assembly connection: denied | ${JSON.stringify(
                    {
                        userId: sessionUser.id,
                        resourceId: connectionId,
                        reason: "connection_not_active",
                    },
                )}`,
            );
            return response.status(400).json({
                success: false,
                message: "Only active connections can be set as default.",
            });
        }

        const updated = await setDefaultUserApiKeyQuery({
            id: connectionId,
            user_id: sessionUser.id,
            provider: ASSEMBLYAI_PROVIDER,
        });

        logger.info(
            `[usersRoutesHandler.setDefaultAssemblyConnection] => set default assembly connection: success | ${JSON.stringify(
                {
                    userId: sessionUser.id,
                    resourceId: connectionId,
                },
            )}`,
        );

        return response.status(200).json({
            success: true,
            message: "Default AssemblyAI connection updated.",
            connection: serializeAssemblyConnection(updated),
        });
    } catch (error) {
        logger.error(
            `[usersRoutesHandler.setDefaultAssemblyConnection] => set default assembly connection: failed | ${JSON.stringify(
                {
                    error: error.message,
                },
            )}`,
        );
        next(error);
    }
};

// Helper function to filter sensitive fields
const filterSensitiveFields = (body, fieldsToHide) => {
    const filteredBody = { ...body };
    fieldsToHide.forEach((field) => {
        if (filteredBody[field]) {
            filteredBody[field] = "[FILTERED]";
        }
    });
    return filteredBody;
};

/*
- purpose: serialize user data for client-facing auth and account responses
- inputs: full user row from the database
- outputs: safe user payload with explicit authentication capability flags
- important behavior:
 - derives password capability from actual stored password presence
 - exposes Google linkage explicitly so the client can render Google-only, password-only, and dual-auth states correctly
*/

const serializeUserInfo = (user) => {
    const hasGoogleAuth = Boolean(user.google_sub);
    const hasPassword = Boolean(user.hashed_password);

    return {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        pending_email: user.pending_email,
        isconfirmed: user.isconfirmed,
        user_role: user.user_role,
        created_at: user.created_at,
        auth_provider: user.auth_provider,
        google_sub: user.google_sub,
        has_password: hasPassword,
        has_google_auth: hasGoogleAuth,
    };
};

const isValidName = (value) => {
    if (typeof value !== "string") return false;
    const v = value.trim();
    if (v.length < 1 || v.length > 30) return false;
    // allow letters + spaces + hyphen
    return /^[A-Za-zÀ-ÖØ-öø-ÿ -]+$/.test(v);
};

const isValidEmail = (value) => {
    if (typeof value !== "string") return false;
    const v = value.trim();
    if (v.length < 3 || v.length > 254) return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
};

const buildConfirmEmailUrl = (token) => {
    const baseUrl = process.env.APP_ORIGIN || "http://localhost:3002";
    return `${baseUrl}/confirm-email?token=${token}`;
};

const createEmailToken = () => {
    const token = crypto.randomBytes(32).toString("hex");
    const token_hash = crypto.createHash("sha256").update(token).digest("hex");
    const expires_at = new Date(Date.now() + 1000 * 60 * 60 * 24);
    return { token, token_hash, expires_at };
};

module.exports = {
    createUsers,
    userLogin,
    userLoggedOut,
    getUserInfo,
    getAllProfiles,
    getCurrentUser,
    updateCurrentUser,
    getMyPreferences,
    patchMyPreferences,
    reauthCurrentUser,
    deleteMe,
    changeMyPassword,
    requestEmailChange,
    requestCurrentEmailConfirmation,
    confirmEmail,
    requestPasswordReset,
    resetPassword,
    unlinkMyGoogle,
    getMyAssemblyConnections,
    createAssemblyConnection,
    updateAssemblyConnection,
    deleteAssemblyConnection,
    setDefaultAssemblyConnection,
};
