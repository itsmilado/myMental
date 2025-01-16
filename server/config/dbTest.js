const pool = require("./db"); // Import the connection from db.js

// Function to describe the table structure and test the connection

(async () => {
    try {
        const result = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'transcriptions'
    `);
        console.log("Table structure:", result.rows);
    } catch (err) {
        console.error("Error describing table:", err.stack);
    } finally {
        pool.end();
    }
})();
