import { pool } from "./pool.ts";
import { estimatePriceTenths } from "./estimate.ts";

const rows = await pool.query<{ id: number; name: string; position: string }>(
  "SELECT id, name, position FROM player",
);
for (const row of rows.rows) {
  await pool.query("UPDATE player_club_stint SET price_tenths = $2 WHERE player_id = $1", [
    row.id,
    estimatePriceTenths(row.id, row.name, row.position),
  ]);
}
console.log(`Estimate prices stored for ${rows.rows.length} players.`);
await pool.end();
