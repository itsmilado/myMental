const fs = require("fs");

const getFileModifiedDate = (filePath) => {
    const stats = fs.statSync(filePath);
    return stats.mtime;
};

module.exports = { getFileModifiedDate };
