// server.js
require("dotenv").config();
const express = require("express");
const app = express();
const path = require("path");
const { usersRoutes } = require("./routes/usersRoutes");
const bodyParser = require("body-parser");
const { transcriptionRoutes } = require("./routes/transcriptionRoutes");
const multer = require("multer");

app.use(express.json());
app.use(express.static(path.join(__dirname, "client", "public")));
app.use(express.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use("/transcription", transcriptionRoutes);
app.use("/users", usersRoutes);

app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        console.log("Multer error:", err);
    } else {
        console.log("Unknown error:", err);
    }
    next(err);
});
// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
