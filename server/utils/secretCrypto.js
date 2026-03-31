// utils/secretCrypto.js

const crypto = require("crypto");

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

const getEncryptionKey = () => {
    const secret = String(process.env.API_KEY_ENCRYPTION_SECRET || "").trim();

    if (!secret) {
        throw new Error("API_KEY_ENCRYPTION_SECRET is not configured.");
    }

    return crypto.createHash("sha256").update(secret).digest();
};

const encryptSecret = (plaintext) => {
    if (typeof plaintext !== "string" || !plaintext.trim()) {
        throw new Error("Secret value is required for encryption.");
    }

    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, getEncryptionKey(), iv);

    const encrypted = Buffer.concat([
        cipher.update(plaintext, "utf8"),
        cipher.final(),
    ]);

    const authTag = cipher.getAuthTag();

    return [
        iv.toString("hex"),
        authTag.toString("hex"),
        encrypted.toString("base64"),
    ].join(":");
};

const decryptSecret = (payload) => {
    if (typeof payload !== "string" || !payload.trim()) {
        throw new Error("Encrypted payload is required for decryption.");
    }

    const parts = payload.split(":");
    if (parts.length !== 3) {
        throw new Error("Encrypted payload format is invalid.");
    }

    const [ivHex, authTagHex, encryptedBase64] = parts;

    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");
    const encrypted = Buffer.from(encryptedBase64, "base64");

    const decipher = crypto.createDecipheriv(ALGORITHM, getEncryptionKey(), iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
        decipher.update(encrypted),
        decipher.final(),
    ]);

    return decrypted.toString("utf8");
};

module.exports = {
    encryptSecret,
    decryptSecret,
};
