import { config } from "../config.ts";
import { pool } from "../db/pool.ts";
import { ApiFootball } from "./apiFootball.ts";
import { mapPosition, mapStatus, matchdayFromRound, shortName } from "./map.ts";

if (!config.apiKey) {
  console.error("Missing API_FOOTBALL_KEY. Add it to .env, then run npm run import again.");
  process.exit(1);
}

const api = new ApiFootball(config.apiKey);
const listed = await api.teams(config.leagueId, config.seasonYear);
const fixtures = await api.fixtures(config.leagueId, config.seasonYear);
const playing = new Set(fixtures.flatMap((row) => [row.teams.home.id, row.teams.away.id]));
const teams = listed.filter((row) => playing.has(row.team.id));
const squads = [];
for (const row of teams) {
  const squad = await api.squad(row.team.id);
  squads.push(squad[0] ?? { team: { id: row.team.id }, players: [] });
  await new Promise((resolve) => setTimeout(resolve, 6500));
}

const client = await pool.connect();
try {
  await client.query("BEGIN");
  const season = await client.query<{ id: number }>(
    `INSERT INTO season (name, matchday_count, provider_league_id)
     VALUES ($1, 34, $2)
     ON CONFLICT (name) DO UPDATE SET provider_league_id = EXCLUDED.provider_league_id
     RETURNING id`,
    [config.seasonName, config.leagueId],
  );
  const seasonId = season.rows[0].id;
  const clubIds = new Map<number, number>();

  for (const row of teams) {
    const saved = await client.query<{ id: number }>(
      `INSERT INTO club (season_id, provider_id, name, short_name)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (season_id, provider_id)
       DO UPDATE SET name = EXCLUDED.name, short_name = EXCLUDED.short_name
       RETURNING id`,
      [seasonId, row.team.id, row.team.name, shortName(row.team.code, row.team.name)],
    );
    clubIds.set(row.team.id, saved.rows[0].id);
  }

  let skipped = 0;
  for (const squad of squads) {
    const clubId = clubIds.get(squad.team.id);
    if (!clubId) continue;
    for (const person of squad.players) {
      const position = mapPosition(person.position);
      if (!position) {
        skipped += 1;
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
        [player.rows[0].id, clubId, seasonId],
      );
    }
  }

  let storedFixtures = 0;
  for (const row of fixtures) {
    const matchday = matchdayFromRound(row.league.round);
    const homeId = clubIds.get(row.teams.home.id);
    const awayId = clubIds.get(row.teams.away.id);
    if (!matchday || !homeId || !awayId) continue;
    await client.query(
      `INSERT INTO fixture (season_id, provider_id, matchday, home_club_id, away_club_id, kickoff, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (season_id, provider_id)
       DO UPDATE SET matchday = EXCLUDED.matchday, kickoff = EXCLUDED.kickoff, status = EXCLUDED.status`,
      [seasonId, row.fixture.id, matchday, homeId, awayId, row.fixture.date, mapStatus(row.fixture.status.short)],
    );
    storedFixtures += 1;
  }

  await client.query("COMMIT");
  console.log(
    `Imported ${clubIds.size} clubs, ${storedFixtures} fixtures. Skipped ${skipped} players. API requests used: ${api.requests}.`,
  );
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  client.release();
  await pool.end();
}
