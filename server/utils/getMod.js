const fs = require("fs");

// Function to get the modified date of a file
// function getFileModifiedDate(filePath) {
//     return new Promise((resolve, reject) => {
//         fs.stat(filePath, (err, stats) => {
//             if (err) {
//                 return reject(err);
//             }
//             resolve(stats.mtime); // `mtime` is the modified date
//         });
//     });
// }

// module.exports = {
//     getFileModifiedDate,
// };

/**
 * Get the modified date of a file.
 * @param {string} filePath - The path to the file.
 * @returns {Date} - The modified date of the file.
 */
const getFileModifiedDate = (filePath) => {
    const stats = fs.statSync(filePath);
    return stats.mtime;
};

module.exports = { getFileModifiedDate };
