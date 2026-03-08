// middlwares/usersRoutesHandler.js

require("dotenv").config();
const { compare } = require("bcryptjs");
const crypto = require("crypto");
const { hashPassword } = require("../utils/hashPass");
const logger = require("../utils/logger");
const pool = require("../db/db");
const loginCheck = require("../utils/loginCheck");
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
    // confirmPendingEmailByTokenHashQuery,
    setPasswordResetTokenByIdQuery,
    getUserByPasswordResetTokenHashQuery,
    clearPasswordResetTokenByIdQuery,
    unlinkGoogleByIdQuery,
    confirmEmailByTokenHashQuery,
    setEmailConfirmationTokenByIdQuery,
} = require("../db/usersQueries");
const {
    deleteTranscriptionTxtFile,
    deleteAudioFileCopy,
} = require("../utils/fileProcessor");
const { mergePreferences } = require("../utils/preferencesDefaults");
const { sendEmail } = require("../utils/mailer");

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

        request.session.user = {
            id: newUser.id,
            email: newUser.email,
            role: newUser.user_role,
        };

        response.status(201).json({
            success: true,
            message: "User created successfully",
            userData: {
                id: newUser.id,
                first_name: newUser.first_name,
                last_name: newUser.last_name,
                email: newUser.email,
                role: newUser.user_role,
                created_at: newUser.created_at,
            },
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
        request.session.user = {
            id: matchUser.id,
            email: matchUser.email,
            role: matchUser.user_role,
        };

        const rememberMe = Boolean(request.body?.rememberMe);

        // - rememberMe=true  => persistent cookie ( 30 days)
        // - rememberMe=false => session cookie (expires on browser close)
        if (rememberMe) {
            request.session.cookie.maxAge = 1000 * 60 * 60 * 24 * 30; // 30 days
        } else {
            request.session.cookie.expires = false;
            request.session.cookie.maxAge = null;
        }

        request.session.save(() => {
            response.status(201).json({
                success: true,
                message: "login success",
                userData: {
                    id: matchUser.id,
                    first_name: matchUser.first_name,
                    last_name: matchUser.last_name,
                    email: matchUser.email,
                    role: matchUser.user_role,
                    created_at: matchUser.created_at,
                },
            });
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

// Re-auth: confirm current password and set a session timestamp
const REAUTH_WINDOW_MS = 1000 * 60 * 5; // 5 minutes (tweakable)

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

        if (user.auth_provider === "google") {
            return response.status(400).json({
                success: false,
                message:
                    "This account uses Google sign-in. Please continue with Google to verify your identity.",
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

        return response.status(200).json({
            success: true,
            message: "Re-authenticated.",
            reauthenticatedAt: now,
            validForMs: REAUTH_WINDOW_MS,
        });
    } catch (error) {
        logger.error(`[reauthCurrentUser] => Error: ${error.message}`);
        next(error);
    }
};

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

        if (user.auth_provider === "google") {
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

        const isGooglePrimaryAccount = user.auth_provider === "google";

        if (!isGooglePrimaryAccount) {
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

            if (!user.hashed_password) {
                return response.status(400).json({
                    success: false,
                    message:
                        "Current password is unavailable for this account.",
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
        }

        if (user.hashed_password) {
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
            message: "Password updated",
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

// Helper function to serialize user information for response
const serializeUserInfo = (user) => {
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
};
