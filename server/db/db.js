const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const { Pool } = require("pg");
const logger = require("../utils/logger");

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

pool.on("connect", () => {
    logger.info(
        `[db.connect] => connect database: success | ${JSON.stringify(
            {
                databaseName: process.env.DATABASE_NAME,
            },
        )}`,
    );
});

// Event listener for errors on idle clients
pool.on("error", (err, client) => {
    logger.error(
        `[db.error] => handle idle client error: failed | ${JSON.stringify(
            {
                databaseName: process.env.DATABASE_NAME,
                error: err.message,
            },
        )}`,
    );
    process.exit(-1); // Exit the process with an error code if an error occurs
});

module.exports = pool;
