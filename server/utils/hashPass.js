//utils/hashPass.js

const { genSalt, hash } = require("bcryptjs");

const hashPassword = async (password) => {
    const salt = await genSalt();
    return await hash(password, salt);
};

module.exports = { hashPassword };
