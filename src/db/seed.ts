import { estimatePriceTenths } from "./estimate.ts";
import { seedBotSquads } from "./seedSquads.ts";
import { hashPassword } from "../auth/password.ts";
import { config } from "../config.ts";
import { pool } from "./pool.ts";
import { ApiFootball } from "../import/apiFootball.ts";
import { loadLigue1Matches } from "../import/footballData.ts";
import { mapFootballStatus } from "../import/map.ts";

const BOTS: Array<[string, number]> = [
  ["Mistral FC", 62],
  ["La Maison Rouge", 58],
  ["Tom's XI", 71],
  ["Noé sans l'arche", 49],
  ["Onze d'Or", 66],
  ["Le Bloc Bas", 44],
  ["Austerlitz Athletic", 75],
  ["The Left Bank", 53],
];

const BOT_PASSWORD = "pitch-day";

async function ensureUser(name: string, base: number) {
  const existing = await pool.query<{ id: number }>("SELECT id FROM app_user WHERE lower(name) = lower($1)", [name]);
  if (existing.rows[0]) return existing.rows[0].id;
  const passwordHash = await hashPassword(BOT_PASSWORD);
  const inserted = await pool.query<{ id: number }>(
    `INSERT INTO app_user (name, password_hash, is_commissioner) VALUES ($1, $2, false) RETURNING id`,
    [name, passwordHash],
  );
  const id = inserted.rows[0].id;
  for (let matchday = 1; matchday <= 6; matchday += 1) {
    const points = 28 + ((base + matchday * 5) % 24);
    await pool.query(
      `INSERT INTO manager_score (user_id, matchday, points) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
      [id, matchday, points],
    );
  }
  return id;
}

const unset = await pool.query<{ id: number; name: string; position: string }>(
  `SELECT player.id, player.name, player.position
   FROM player
   JOIN player_club_stint stint ON stint.player_id = player.id
   WHERE stint.price_tenths IS NULL`,
);
for (const row of unset.rows) {
  await pool.query("UPDATE player_club_stint SET price_tenths = $2 WHERE player_id = $1 AND price_tenths IS NULL", [
    row.id,
    estimatePriceTenths(row.id, row.name, row.position),
  ]);
}

const passwordHash = await hashPassword(BOT_PASSWORD);
for (const [name, base] of BOTS) {
  const id = await ensureUser(name, base);
  await pool.query("UPDATE app_user SET password_hash = $2 WHERE id = $1 AND is_commissioner = false", [id, passwordHash]);
}

const people = await pool.query<{ id: number; is_commissioner: boolean }>("SELECT id, is_commissioner FROM app_user");
for (const person of people.rows) {
  if (!person.is_commissioner) continue;
  for (let matchday = 1; matchday <= 6; matchday += 1) {
    await pool.query(
      `INSERT INTO manager_score (user_id, matchday, points) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
      [person.id, matchday, 30 + ((person.id + matchday * 4) % 18)],
    );
  }
}

const league = await pool.query<{ id: number }>("SELECT id FROM fantasy_league WHERE code = 'RDM2627'");
let leagueId = league.rows[0]?.id;
if (!leagueId) {
  const owner = people.rows.find((person) => person.is_commissioner) ?? people.rows[0];
  if (owner) {
    const created = await pool.query<{ id: number }>(
      `INSERT INTO fantasy_league (name, code, created_by) VALUES ('Rue des Martyrs', 'RDM2627', $1) RETURNING id`,
      [owner.id],
    );
    leagueId = created.rows[0].id;
  }
}
if (leagueId) {
  for (const person of people.rows) {
    await pool.query(
      `INSERT INTO league_member (league_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [leagueId, person.id],
    );
  }
}

const storedSquads = await seedBotSquads();
console.log(`Stored squads for ${storedSquads} managers.`);

if (config.footballDataToken) {
  const matches = await loadLigue1Matches(config.footballDataToken);
  for (const match of matches) {
    await pool.query(
      `UPDATE fixture SET home_goals = $2, away_goals = $3, status = $4 WHERE provider_id = $1`,
      [match.id, match.score?.fullTime?.home ?? null, match.score?.fullTime?.away ?? null, mapFootballStatus(match.status)],
    );
  }
  console.log(`Scores updated for ${matches.length} matches.`);
}

if (config.apiKey) {
  const api = new ApiFootball(config.apiKey);
  const clubs = await pool.query<{ provider_id: number }>("SELECT provider_id FROM club ORDER BY name");
  for (const [index, club] of clubs.rows.entries()) {
    if (index > 0) await new Promise((resolve) => setTimeout(resolve, 6500));
    try {
      const squads = await api.squad(club.provider_id);
      for (const person of squads[0]?.players ?? []) {
        await pool.query(`UPDATE player SET age = $2, shirt_number = $3 WHERE provider_id = $1`, [
          person.id,
          person.age,
          person.number,
        ]);
      }
      console.log(`Details stored for club ${club.provider_id}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`Skipped club ${club.provider_id}: ${message}`);
      break;
    }
  }
}

console.log("Seed data is ready. Bot password is pitch-day.");
await pool.end();
