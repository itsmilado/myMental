const multer = require("multer");
const path = require("path");

// Set the storage engine for the uploaded files
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "uploads/"); // Set the destination folder for uploaded files
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        const name = path.basename(file.originalname, ext);
        cb(null, `${name}-${Date.now()}${ext}`);
    },
});

const upload = multer({ storage });

module.exports = upload;
