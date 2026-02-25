// server.js
require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const cors = require("cors");
const app = express();
if (process.env.NODE_ENV === "production") {
    app.set("trust proxy", 1);
}
const logger = require("./utils/logger");
const { sessionMiddleware } = require("./middlewares/sessionMiddleware");
const { usersRoutes } = require("./routes/usersRoutes");
const { transcriptionRoutes } = require("./routes/transcriptionRoutes");
const { oauthRoutes } = require("./routes/oauthRoutes");

app.use(express.json());
app.use(express.static(path.join(__dirname, "client", "public")));
app.use(express.urlencoded({ extended: false }));
app.use(cors({ origin: process.env.APP_ORIGIN, credentials: true })); // allow frontend
app.use(bodyParser.json());
app.use(sessionMiddleware);
app.use("/transcription", transcriptionRoutes);
app.use("/users", usersRoutes);
app.use("/auth", oauthRoutes);

// Start the server
const PORT = process.env.PORT || 5002;
app.listen(PORT, () => {
    logger.info(`Server is running on port ${PORT}`);
});
