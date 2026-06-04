import pg from "pg";
import "dotenv/config";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

async function clear() {
  console.log("Dropping all tables...");
  await pool.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
  console.log("Done.");
  process.exit(0);
}

clear();
