// Import the 'path' module to handle and transform file paths
const path = require("path");

// Load environment variables from the .env file located in the parent directory
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

// Import the 'pg' module to interact with PostgreSQL databases
const { Pool } = require("pg");

// Create a new pool instance to manage PostgreSQL connections
// The pool is configured to use the DATABASE_URL environment variable for connection details
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

// Event listener for successful connection to the database
pool.on("connect", () => {
    console.log(`Connected to the ${process.env.DATABASE_NAME} database.`);
});

// Event listener for errors on idle clients
pool.on("error", (err, client) => {
    console.error("Unexpected error on idle client", err);
    process.exit(-1); // Exit the process with an error code if an error occurs
});

// Export the pool instance for use in other parts of the application
module.exports = pool;
