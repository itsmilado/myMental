// server.js
require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const app = express();
const logger = require("./utils/logger");
const { sessionMiddleware } = require("./middlewares/sessionMiddleware");
const { usersRoutes } = require("./routes/usersRoutes");
const { transcriptionRoutes } = require("./routes/transcriptionRoutes");

app.use(express.json());
app.use(express.static(path.join(__dirname, "client", "public")));
app.use(express.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(sessionMiddleware);
app.use("/transcription", transcriptionRoutes);
app.use("/users", usersRoutes);

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    logger.info(`Server is running on port ${PORT}`);
});
