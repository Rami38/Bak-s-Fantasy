import { config } from "../config.ts";
import { pool } from "../db/pool.ts";
import { ApiFootball, type TeamRow } from "./apiFootball.ts";
import { loadLigue1Matches, type FootballDataTeam } from "./footballData.ts";
import { canonicalClubName, mapFootballStatus, mapPosition, shortName } from "./map.ts";

const SEARCH: Record<string, string> = {
  troyes: "Troyes",
  lorient: "Lorient",
  "le mans": "Le Mans",
  "paris fc": "Paris FC",
};

function pickTeam(rows: TeamRow[], canonical: string): TeamRow | null {
  const exact = rows.find((row) => canonicalClubName(row.team.name) === canonical);
  if (exact) return exact;
  return rows.find((row) => canonicalClubName(row.team.name).includes(canonical)) ?? null;
}

async function squadFor(api: ApiFootball, teamId: number) {
  const rows = await api.squad(teamId);
  return rows[0]?.players ?? [];
}

if (!config.footballDataToken) {
  console.error("Set FOOTBALL_DATA_TOKEN in .env, then run this again.");
  process.exit(1);
}
if (!config.apiKey) {
  console.error("Set API_FOOTBALL_KEY in .env, then run this again.");
  process.exit(1);
}

const matches = await loadLigue1Matches(config.footballDataToken);
const teams = new Map<string, FootballDataTeam>();
for (const match of matches) {
  for (const team of [match.homeTeam, match.awayTeam]) {
    teams.set(canonicalClubName(team.name), team);
  }
}

const api = new ApiFootball(config.apiKey);
const client = await pool.connect();

try {
  const season = await client.query<{ id: number }>(
    `SELECT id FROM season WHERE name IN ('2024/25', '2026/27')`,
  );
  if (season.rowCount !== 1) throw new Error("Expected one season row.");
  const seasonId = season.rows[0].id;

  const stored = await client.query<{ id: number; name: string; provider_id: number }>(
    `SELECT id, name, provider_id FROM club WHERE season_id = $1`,
    [seasonId],
  );
  const clubs = new Map(stored.rows.map((row) => [canonicalClubName(row.name), row]));
  const counted = await client.query<{ club_id: number; players: string }>(
    `SELECT club_id, count(*)::text AS players FROM player_club_stint WHERE season_id = $1 GROUP BY club_id`,
    [seasonId],
  );
  const squadSizes = new Map(counted.rows.map((row) => [row.club_id, Number(row.players)]));

  let spaced = false;
  const pause = async () => {
    if (spaced) await new Promise((resolve) => setTimeout(resolve, 6500));
    spaced = true;
  };

  for (const [canonical, team] of teams) {
    let club = clubs.get(canonical);
    if (!club) {
      const query = SEARCH[canonical] ?? team.shortName;
      await pause();
      const rows = await api.searchTeams(query);
      const found = pickTeam(rows, canonical);
      if (!found) {
        throw new Error(
          `API-Football has no club for ${team.name}. Saw: ${rows.map((row) => row.team.name).join(", ") || "nothing"}`,
        );
      }
      const inserted = await client.query<{ id: number; name: string; provider_id: number }>(
        `INSERT INTO club (season_id, provider_id, name, short_name)
         VALUES ($1, $2, $3, $4)
         RETURNING id, name, provider_id`,
        [seasonId, found.team.id, team.shortName.trim(), shortName(team.tla, team.shortName)],
      );
      club = inserted.rows[0];
      clubs.set(canonical, club);
      console.log(`Added ${club.name}`);
    }

    if ((squadSizes.get(club.id) ?? 0) > 0) continue;
    await pause();
    const players = await squadFor(api, club.provider_id);
    for (const person of players) {
      const position = mapPosition(person.position);
      if (!position) {
        console.warn(`Skipped ${person.name}: unknown position "${person.position ?? ""}"`);
        continue;
      }
      const player = await client.query<{ id: number }>(
        `INSERT INTO player (provider_id, name, position)
         VALUES ($1, $2, $3)
         ON CONFLICT (provider_id)
         DO UPDATE SET name = EXCLUDED.name, position = EXCLUDED.position
         RETURNING id`,
        [person.id, person.name, position],
      );
      await client.query(
        `INSERT INTO player_club_stint (player_id, club_id, season_id, from_gameweek)
         VALUES ($1, $2, $3, 1)
         ON CONFLICT (player_id, season_id)
         DO UPDATE SET club_id = EXCLUDED.club_id`,
        [player.rows[0].id, club.id, seasonId],
      );
    }
    console.log(`Squad loaded for ${club.name}: ${players.length} players`);
  }

  await client.query("BEGIN");
  await client.query(`UPDATE season SET name = $1 WHERE id = $2`, [config.seasonName, seasonId]);
  await client.query(`DELETE FROM fixture WHERE season_id = $1`, [seasonId]);

  const keepIds: number[] = [];
  let storedFixtures = 0;
  for (const match of matches) {
    const home = clubs.get(canonicalClubName(match.homeTeam.name));
    const away = clubs.get(canonicalClubName(match.awayTeam.name));
    if (!home || !away || !match.matchday) {
      throw new Error(`Could not place match ${match.id}`);
    }
    keepIds.push(home.id, away.id);
    await client.query(
      `INSERT INTO fixture (season_id, provider_id, matchday, home_club_id, away_club_id, kickoff, status, home_goals, away_goals)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        seasonId,
        match.id,
        match.matchday,
        home.id,
        away.id,
        match.utcDate,
        mapFootballStatus(match.status),
        match.score?.fullTime?.home ?? null,
        match.score?.fullTime?.away ?? null,
      ],
    );
    storedFixtures += 1;
  }

  const uniqueKeep = [...new Set(keepIds)];
  await client.query(
    `DELETE FROM player_club_stint WHERE season_id = $1 AND NOT (club_id = ANY($2::int[]))`,
    [seasonId, uniqueKeep],
  );
  const removed = await client.query(
    `DELETE FROM club WHERE season_id = $1 AND NOT (id = ANY($2::int[])) RETURNING name`,
    [seasonId, uniqueKeep],
  );

  await client.query("COMMIT");
  console.log(
    `Stored ${storedFixtures} fixtures for ${config.seasonName}. Removed ${removed.rows.map((row) => row.name).join(", ") || "no clubs"}. API-Football requests: ${api.requests}.`,
  );
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  client.release();
  await pool.end();
}
