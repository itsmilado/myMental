const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const { Pool } = require("pg");

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

pool.on("connect", () => {
    console.log(`Connected to the ${process.env.DATABASE_NAME} database.`);
});

// Event listener for errors on idle clients
pool.on("error", (err, client) => {
    console.error("Unexpected error on idle client", err);
    process.exit(-1); // Exit the process with an error code if an error occurs
});

module.exports = pool;
