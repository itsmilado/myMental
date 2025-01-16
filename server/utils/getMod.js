const fs = require("fs");

// Function to get the modified date of a file
function getFileModifiedDate(filePath) {
    return new Promise((resolve, reject) => {
        fs.stat(filePath, (err, stats) => {
            if (err) {
                return reject(err);
            }
            resolve(stats.mtime); // `mtime` is the modified date
        });
    });
}

// Example usage
const filePath = "../../../Dickinson 01.10.m4a";

getFileModifiedDate(filePath)
    .then((modifiedDate) => {
        console.log("File modified date:", modifiedDate);
    })
    .catch((err) => {
        console.error("Error fetching file stats:", err);
    });
