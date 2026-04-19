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
        logger.info(
            `Incoming request to ${request.method} ${request.originalUrl}`,
        ); // Log the request URL

        // Filter sensitive fields from the request body before logging
        const filteredBody = filterSensitiveFields(request.body, [
            "password",
            "repeat_password",
        ]);
        logger.info(`Request body: ${JSON.stringify(filteredBody)}`); // Log filtered body

        const { password, user_role } = request.body;
        const hashed_password = await hashPassword(password);
        const newUser = await createUserQuery({
            ...request.body,
            hashed_password,
            user_role: user_role || "user", // Set user_role to "user" if it is not provided
        });
        logger.info(
            `New user created: user_id(${JSON.stringify(newUser.id)}) `,
        ); // Log the new user

        await establishAuthenticatedSession(request, newUser);

        response.status(201).json({
            success: true,
            message: "User created successfully",
            userData: serializeUserInfo(newUser),
        });
    } catch (error) {
        logger.error(
            `[usersRoutesHandler > Line 15 - createUsers] => Error creating user: ${error.message}`,
        );
        next(error);
    }
};

const userLogin = async (request, response, next) => {
    try {
        logger.info(
            `Incoming request to ${request.method} ${request.originalUrl}`,
        ); // Log the request URL

        // Filter sensitive fields from the request body before logging
        const filteredBody = filterSensitiveFields(request.body, ["password"]);
        logger.info(`Request body: ${JSON.stringify(filteredBody)}`); // Log filtered body

        const matchUser = await loginCheck({ ...request.body });

        // wrong credentials
        if (!matchUser) {
            logger.error(
                `[userHandlers > userLogin] User login failed: email or password is wrong!`,
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
            `User logged in successfully: user_id ${JSON.stringify(
                matchUser.id,
            )} user_role ${JSON.stringify(matchUser.user_role)}`,
        );

        const rememberMe = Boolean(request.body?.rememberMe);

        await establishAuthenticatedSession(request, matchUser, { rememberMe });

        return response.status(201).json({
            success: true,
            message: "login success",
            userData: serializeUserInfo(matchUser),
        });
    } catch (error) {
        logger.error(`[userHandlers > userLogin] Error: ${error.message}`);
        next(error);
    }
};

const userLoggedOut = async (request, response, next) => {
    try {
        logger.info(
            `Incoming request to ${request.method} ${request.originalUrl}`,
        );
        request.session.destroy((error) => {
            if (error) {
                logger.error(
                    `[userHandlers > userLoggedOut] Error destroying session: ${error.message}`,
                );
                return next(error); // Pass the error to the error handler middleware
            }
            const isProd = process.env.NODE_ENV === "production";
            response.clearCookie("sessionId", {
                httpOnly: true,
                sameSite: "lax",
                secure: isProd, // true in production behind HTTPS
            }); // Clear the session cookie
            logger.info("Session cookie cleared");
            response
                .status(200)
                .json({ success: true, message: "logout successfull" });
        });
    } catch (error) {
        logger.error(`[userHandlers > userLoggedOut] Error: ${error.message}`);
        next(error);
    }
};

const getUserInfo = async (request, response, next) => {
    try {
        logger.info(
            `Incoming request to ${request.method} ${request.originalUrl}`,
        ); // Log the request URL
        logger.info(`Request params: ${JSON.stringify(request.params)}`); // Log the request params

        const user = await getUserByIdQuery({ ...request.params });
        if (!user) {
            response
                .status(404)
                .json({ success: false, message: "User not found" });
            return;
        }
        logger.info(`User found by ID: ${JSON.stringify(user.id)}`); // Log the user object
        response.status(200).json({
            success: true,
            message: "User found",
            data: serializeUserInfo(user),
        });
    } catch (error) {
        logger.error(
            `[usersRoutesHandler > Line 38 - getUserInfo] => Error getting user info: ${error.message}`,
        );
        next(error);
    }
};

const getAllProfiles = async (request, response, next) => {
    try {
        logger.info(
            `Incoming request to ${request.method} ${request.originalUrl}`,
        ); // Log the request URL
        const users = await getAllUsersQuery();
        if (!users) {
            response
                .status(404)
                .json({ success: false, message: "No users retrieved" });
            return;
        }
        logger.info(
            `[usersRoutesHandler - getAllProfiles]: ${JSON.stringify(
                serializeUserInfo(users),
            )}`,
        ); // Log the users array
        response.status(200).json({
            success: true,
            message: "Users found",
            data: users.map((user) => serializeUserInfo(user)),
        });
    } catch (error) {
        logger.error(
            `[usersRoutesHandler - getAllProfiles] => Error fetching users: ${error.message}`,
        );
        next(error);
    }
};

const getCurrentUser = async (request, response, next) => {
    try {
        logger.info(
            `Incoming request to ${request.method} ${request.originalUrl}`,
        );

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
        logger.info(`User is Logged-in with id : ${id} `);
        const userData = serializeUserInfo(user);

        return response.status(200).json({
            success: true,
            message: "User is authenticated",
            userData,
        });
    } catch (error) {
        logger.error(
            `[usersRoutesHandler > getCurrentUser] => Error getting current user: ${error.message}`,
        );
        next(error);
    }
};

const updateCurrentUser = async (request, response, next) => {
    try {
        logger.info(
            `Incoming request to ${request.method} ${request.originalUrl}`,
        );

        if (!request.session || !request.session.user) {
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
            return response.status(400).json({
                success: false,
                message: "No fields provided to update",
            });
        }

        if (first_name !== undefined && !isValidName(first_name)) {
            return response.status(400).json({
                success: false,
                message: "Invalid first name",
            });
        }

        if (last_name !== undefined && !isValidName(last_name)) {
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
                logger.warn(`Email already in use by another user: ${email}`);
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

        return response.status(200).json({
            success: true,
            message: "Profile updated",
            userData,
        });
    } catch (error) {
        logger.error(
            `[usersRoutesHandler > updateCurrentUser] => Error updating current user: ${error.message}`,
        );
        next(error);
    }
};

const getMyPreferences = async (request, response, next) => {
    try {
        const user = request.session?.user;
        if (!user?.id) {
            return response
                .status(401)
                .json({ success: false, message: "Unauthorized" });
        }

        const stored = await getUserPreferencesByIdQuery({ id: user.id });
        const merged = mergePreferences(stored);

        return response.status(200).json({
            success: true,
            message: "Preferences loaded",
            preferences: merged,
        });
    } catch (error) {
        logger.error(`[getMyPreferences] => ${error.message}`);
        next(error);
    }
};

// shallow merge patch at section level (appearance/transcription/ai)
const patchMyPreferences = async (request, response, next) => {
    try {
        const user = request.session?.user;
        if (!user?.id) {
            return response
                .status(401)
                .json({ success: false, message: "Unauthorized" });
        }

        const patch = request.body || {};
        if (typeof patch !== "object" || Array.isArray(patch)) {
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

        return response.status(200).json({
            success: true,
            message: "Preferences updated",
            preferences: mergePreferences(saved),
        });
    } catch (error) {
        logger.error(`[patchMyPreferences] => ${error.message}`);
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
        logger.info(
            `Incoming request to ${request.method} ${request.originalUrl}`,
        );

        const sessionUser = request.session?.user;
        if (!sessionUser?.id) {
            return response.status(401).json({
                success: false,
                message: "Unauthorized access. Please log in.",
            });
        }

        const { password } = request.body || {};
        if (!password || typeof password !== "string" || password.length < 1) {
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
            return response.status(400).json({
                success: false,
                message:
                    "This account does not have password sign-in enabled. Please continue with Google to verify your identity.",
            });
        }

        const ok = await compare(password, user.hashed_password);
        if (!ok) {
            return response.status(401).json({
                success: false,
                message: "Password is incorrect.",
            });
        }

        const now = Date.now();
        request.session.reauthenticatedAt = now;

        return request.session.save((err) => {
            if (err) return next(err);

            return response.status(200).json({
                success: true,
                message: "Re-authenticated.",
                reauthenticatedAt: now,
                validForMs: REAUTH_WINDOW_MS,
            });
        });
    } catch (error) {
        logger.error(`[reauthCurrentUser] => Error: ${error.message}`);
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
        logger.info(
            `Incoming request to ${request.method} ${request.originalUrl}`,
        );

        const sessionUser = request.session?.user;
        if (!sessionUser?.id) {
            return response.status(401).json({
                success: false,
                message: "Not authenticated.",
            });
        }

        const user = await getUserByIdQuery({ id: sessionUser.id });
        if (!user) {
            return response.status(404).json({
                success: false,
                message: "User not found.",
            });
        }

        if (!user.google_sub) {
            return response.status(400).json({
                success: false,
                message: "Google sign-in is not linked to this account.",
            });
        }

        // Prevent removing the only available sign-in method
        if (!user.hashed_password) {
            return response.status(400).json({
                success: false,
                message:
                    "A password must be set before removing Google sign-in.",
            });
        }

        const updated = await unlinkGoogleByIdQuery({ id: user.id });
        request.session.reauthenticatedAt = null;

        return response.status(200).json({
            success: true,
            message: "Google sign-in removed successfully.",
            userData: serializeUserInfo(updated),
        });
    } catch (error) {
        logger.error(`[unlinkMyGoogle] => Error: ${error.message}`);
        next(error);
    }
};

const deleteMe = async (request, response, next) => {
    const sessionUser = request.session?.user;

    if (!sessionUser?.id) {
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
                    `[deleteMe] rollback failed: ${rollbackErr.message}`,
                );
            }
        }

        logger.error(`[deleteMe] DB transaction failed: ${error.message}`);
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
                `[deleteMe] Failed deleting transcription txt for ${fileName}: ${e.message}`,
            );
        }

        try {
            deleteAudioFileCopy(fileName);
        } catch (e) {
            logger.warn(
                `[deleteMe] Failed deleting audio copy for ${fileName}: ${e.message}`,
            );
        }
    }

    // Destroy session + clear cookie
    request.session.destroy((err) => {
        if (err) {
            logger.error(`[deleteMe] session destroy failed: ${err.message}`);
            // Account is already deleted; return success but warn.
            response.clearCookie("sessionId");
            return response.status(200).json({
                success: true,
                message:
                    "Account deleted (session cleanup had a minor issue, please refresh).",
            });
        }

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
        logger.info(
            `Incoming request to ${request.method} ${request.originalUrl}`,
        );

        const sessionUser = request.session?.user;
        if (!sessionUser?.id) {
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
            return response.status(400).json({
                success: false,
                message: "New password must be at least 6 characters",
            });
        }

        const user = await getUserByIdQuery({ id: sessionUser.id });
        if (!user) {
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
                return response.status(401).json({
                    success: false,
                    message: "Current password is incorrect.",
                });
            }

            // Prevent reusing the existing password
            const isSame = await compare(new_password, user.hashed_password);
            if (isSame) {
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

        return response.status(200).json({
            success: true,
            message: hasPassword ? "Password updated" : "Password created",
            userData: serializeUserInfo(updated),
        });
    } catch (error) {
        logger.error(`[changeMyPassword] => Error: ${error.message}`);
        next(error);
    }
};

const requestCurrentEmailConfirmation = async (request, response, next) => {
    try {
        logger.info(
            `Incoming request to ${request.method} ${request.originalUrl}`,
        );

        const sessionUser = request.session?.user;
        if (!sessionUser?.id) {
            return response.status(401).json({
                success: false,
                message: "Not authenticated.",
            });
        }

        const user = await getUserByIdQuery({ id: sessionUser.id });
        if (!user) {
            return response.status(404).json({
                success: false,
                message: "User not found.",
            });
        }

        if (user.pending_email) {
            return response.status(409).json({
                success: false,
                message:
                    "Finish confirming your pending email change before confirming your current email again.",
            });
        }

        if (user.isconfirmed) {
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

        return response.status(200).json({
            success: true,
            message: "Confirmation email sent to your current email address.",
        });
    } catch (error) {
        logger.error(
            `[requestCurrentEmailConfirmation] => Error: ${error.message}`,
        );
        next(error);
    }
};

const requestEmailChange = async (request, response, next) => {
    try {
        logger.info(
            `Incoming request to ${request.method} ${request.originalUrl}`,
        );

        const sessionUser = request.session?.user;
        if (!sessionUser?.id) {
            return response.status(401).json({
                success: false,
                message: "Not authenticated.",
            });
        }

        const user = await getUserByIdQuery({ id: sessionUser.id });
        if (!user) {
            return response.status(404).json({
                success: false,
                message: "User not found.",
            });
        }

        const newEmailRaw = request.body?.new_email;
        if (!newEmailRaw || !isValidEmail(newEmailRaw)) {
            return response.status(400).json({
                success: false,
                message: "Enter a valid email address.",
            });
        }

        const new_email = String(newEmailRaw).trim().toLowerCase();

        if (new_email === String(user.email).trim().toLowerCase()) {
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

        return response.status(200).json({
            success: true,
            message: "Confirmation email sent to your new email address.",
            pending_email: new_email,
        });
    } catch (error) {
        logger.error(`[requestEmailChange] => Error: ${error.message}`);
        next(error);
    }
};

const confirmEmail = async (request, response, next) => {
    try {
        logger.info(
            `Incoming request to ${request.method} ${request.originalUrl}`,
        );

        const token = String(request.query?.token || "").trim();
        if (!token) {
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

        return response.status(200).json({
            success: true,
            message: "Email confirmed successfully.",
            userData: serializeUserInfo(updated),
        });
    } catch (error) {
        logger.error(`[confirmEmail] => Error: ${error.message}`);
        next(error);
    }
};

const requestPasswordReset = async (request, response, next) => {
    try {
        logger.info(
            `Incoming request to ${request.method} ${request.originalUrl}`,
        );

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
            return genericResponse();
        }

        const email = String(emailRaw).trim().toLowerCase();

        const user = await getUserByEmailQuery({ email });
        if (!user) return genericResponse();

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

        return genericResponse();
    } catch (error) {
        logger.error(
            `[usersRoutesHandler > requestPasswordReset] => Error: ${error.message}`,
        );
        next(error);
    }
};

const resetPassword = async (request, response, next) => {
    try {
        logger.info(
            `Incoming request to ${request.method} ${request.originalUrl}`,
        );

        const token = String(request.body?.token || "").trim();
        const new_password = String(request.body?.new_password || "");

        if (!token || !new_password) {
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

        return response.status(200).json({
            success: true,
            message: "Password updated successfully",
        });
    } catch (error) {
        logger.error(
            `[usersRoutesHandler > resetPassword] => Error: ${error.message}`,
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
        logger.info(
            `Incoming request to ${request.method} ${request.originalUrl}`,
        );

        const sessionUser = request.session?.user;
        if (!sessionUser?.id) {
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
        logger.error(`[getMyAssemblyConnections] => Error: ${error.message}`);
        next(error);
    }
};

const createAssemblyConnection = async (request, response, next) => {
    try {
        logger.info(
            `Incoming request to ${request.method} ${request.originalUrl}`,
        );

        const filteredBody = filterSensitiveFields(request.body, ["api_key"]);
        logger.info(`Request body: ${JSON.stringify(filteredBody)}`);

        const sessionUser = request.session?.user;
        if (!sessionUser?.id) {
            return response.status(401).json({
                success: false,
                message: "Unauthorized access. Please log in.",
            });
        }

        const label = normalizeConnectionLabel(request.body?.label);
        const apiKey = normalizeApiKey(request.body?.api_key);
        const wantsDefault = Boolean(request.body?.is_default);

        if (!label) {
            return response.status(400).json({
                success: false,
                message: "Connection label is required.",
            });
        }

        if (label.length > MAX_CONNECTION_LABEL_LENGTH) {
            return response.status(400).json({
                success: false,
                message: `Connection label must be ${MAX_CONNECTION_LABEL_LENGTH} characters or fewer.`,
            });
        }

        if (!apiKey) {
            return response.status(400).json({
                success: false,
                message: "AssemblyAI API key is required.",
            });
        }

        const validation = await validateAssemblyApiKey(apiKey);
        if (!validation.valid) {
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

        return response.status(201).json({
            success: true,
            message: "AssemblyAI connection saved.",
            connection: serializeAssemblyConnection(connection),
        });
    } catch (error) {
        logger.error(`[createAssemblyConnection] => Error: ${error.message}`);
        next(error);
    }
};

const updateAssemblyConnection = async (request, response, next) => {
    try {
        logger.info(
            `Incoming request to ${request.method} ${request.originalUrl}`,
        );

        const filteredBody = filterSensitiveFields(request.body, ["api_key"]);
        logger.info(`Request body: ${JSON.stringify(filteredBody)}`);

        const sessionUser = request.session?.user;
        if (!sessionUser?.id) {
            return response.status(401).json({
                success: false,
                message: "Unauthorized access. Please log in.",
            });
        }

        const connectionId = parsePositiveInteger(request.params?.id);
        if (!connectionId) {
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
            return response.status(404).json({
                success: false,
                message: "AssemblyAI connection not found.",
            });
        }

        if (request.body?.is_default !== undefined) {
            return response.status(400).json({
                success: false,
                message: "Use the set-default endpoint for default changes.",
            });
        }

        const hasLabelField = request.body?.label !== undefined;
        const hasApiKeyField = request.body?.api_key !== undefined;

        if (!hasLabelField && !hasApiKeyField) {
            return response.status(400).json({
                success: false,
                message: "No fields provided to update.",
            });
        }

        let label;
        if (hasLabelField) {
            label = normalizeConnectionLabel(request.body?.label);

            if (!label) {
                return response.status(400).json({
                    success: false,
                    message: "Connection label cannot be empty.",
                });
            }

            if (label.length > MAX_CONNECTION_LABEL_LENGTH) {
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
                return response.status(403).json({
                    success: false,
                    message: "Re-authentication required",
                });
            }

            const apiKey = normalizeApiKey(request.body?.api_key);

            if (!apiKey) {
                return response.status(400).json({
                    success: false,
                    message: "AssemblyAI API key cannot be empty.",
                });
            }

            const validation = await validateAssemblyApiKey(apiKey);
            if (!validation.valid) {
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

        return response.status(200).json({
            success: true,
            message: "AssemblyAI connection updated.",
            connection: serializeAssemblyConnection(updated),
        });
    } catch (error) {
        logger.error(`[updateAssemblyConnection] => Error: ${error.message}`);
        next(error);
    }
};

const deleteAssemblyConnection = async (request, response, next) => {
    try {
        logger.info(
            `Incoming request to ${request.method} ${request.originalUrl}`,
        );

        const sessionUser = request.session?.user;
        if (!sessionUser?.id) {
            return response.status(401).json({
                success: false,
                message: "Unauthorized access. Please log in.",
            });
        }

        const connectionId = parsePositiveInteger(request.params?.id);
        if (!connectionId) {
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

        return response.status(200).json({
            success: true,
            message: "AssemblyAI connection removed.",
            connection: serializeAssemblyConnection(deleted),
        });
    } catch (error) {
        logger.error(`[deleteAssemblyConnection] => Error: ${error.message}`);
        next(error);
    }
};

const setDefaultAssemblyConnection = async (request, response, next) => {
    try {
        logger.info(
            `Incoming request to ${request.method} ${request.originalUrl}`,
        );

        const sessionUser = request.session?.user;
        if (!sessionUser?.id) {
            return response.status(401).json({
                success: false,
                message: "Unauthorized access. Please log in.",
            });
        }

        const connectionId = parsePositiveInteger(request.params?.id);
        if (!connectionId) {
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
            return response.status(404).json({
                success: false,
                message: "AssemblyAI connection not found.",
            });
        }

        if (existing.status !== "active") {
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

        return response.status(200).json({
            success: true,
            message: "Default AssemblyAI connection updated.",
            connection: serializeAssemblyConnection(updated),
        });
    } catch (error) {
        logger.error(
            `[setDefaultAssemblyConnection] => Error: ${error.message}`,
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
