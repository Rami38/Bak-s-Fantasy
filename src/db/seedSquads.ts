import { config } from "../config.ts";
import { buildBotSquad, type SquadPlayer } from "./botSquad.ts";
import { pool } from "./pool.ts";
import { saveSquad } from "./squadStore.ts";

const BOTS = [
  "Mistral FC",
  "La Maison Rouge",
  "Tom's XI",
  "Noé sans l'arche",
  "Onze d'Or",
  "Le Bloc Bas",
  "Austerlitz Athletic",
  "The Left Bank",
];

export async function seedBotSquads(): Promise<number> {
  const season = await pool.query<{ id: number }>("SELECT id FROM season WHERE name = $1", [config.seasonName]);
  const seasonId = season.rows[0]?.id;
  if (!seasonId) return 0;
  const roster = await pool.query<{ id: number; position: SquadPlayer["position"]; club_id: number; price_tenths: number }>(
    `SELECT p.id, p.position, s.club_id, s.price_tenths
     FROM player p
     JOIN player_club_stint s ON s.player_id = p.id
     WHERE s.season_id = $1 AND s.price_tenths IS NOT NULL`,
    [seasonId],
  );
  const players: SquadPlayer[] = roster.rows.map((row) => ({
    id: row.id,
    position: row.position,
    clubId: row.club_id,
    priceTenths: row.price_tenths,
  }));
  let stored = 0;
  for (const [index, name] of BOTS.entries()) {
    const user = await pool.query<{ id: number }>("SELECT id FROM app_user WHERE lower(name) = lower($1)", [name]);
    const userId = user.rows[0]?.id;
    if (!userId) continue;
    const existing = await pool.query("SELECT 1 FROM manager_squad WHERE user_id = $1 AND season_id = $2", [userId, seasonId]);
    if (existing.rows.length > 0) continue;
    const built = buildBotSquad(players, index + 1);
    if (built.playerIds.length !== 15) {
      console.warn(`Could not fill a squad for ${name}.`);
      continue;
    }
    const result = await saveSquad(userId, seasonId, built);
    if ("error" in result) {
      console.warn(`Could not store a squad for ${name}.`);
      continue;
    }
    stored += 1;
  }
  return stored;
}

const ranDirectly = process.argv[1]?.replaceAll("\\", "/").endsWith("src/db/seedSquads.ts");
if (ranDirectly) {
  const stored = await seedBotSquads();
  console.log(`Stored squads for ${stored} managers.`);
  await pool.end();
}
