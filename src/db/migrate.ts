import fs from "node:fs";
import path from "node:path";
import { pool } from "./pool.ts";

const files = ["001_schema.sql", "002_accounts.sql", "003_game.sql", "004_profile.sql", "005_squad.sql"];

for (let attempt = 1; attempt <= 20; attempt += 1) {
  try {
    for (const file of files) {
      const schema = fs.readFileSync(path.join(process.cwd(), "sql", file), "utf8");
      await pool.query(schema);
    }
    console.log("Database schema is ready.");
    await pool.end();
    process.exit(0);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (attempt === 20) {
      console.error(message);
      await pool.end();
      process.exit(1);
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}
