// server.js
require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const cors = require("cors");
const app = express();
const logger = require("./utils/logger");
const { sessionMiddleware } = require("./middlewares/sessionMiddleware");
const { usersRoutes } = require("./routes/usersRoutes");
const { transcriptionRoutes } = require("./routes/transcriptionRoutes");

app.use(express.json());
app.use(express.static(path.join(__dirname, "client", "public")));
app.use(express.urlencoded({ extended: false }));
app.use(cors({ origin: "http://localhost:3002", credentials: true })); // allow frontend
app.use(bodyParser.json());
app.use(sessionMiddleware);
app.use("/transcription", transcriptionRoutes);
app.use("/users", usersRoutes);

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    logger.info(`Server is running on port ${PORT}`);
});
