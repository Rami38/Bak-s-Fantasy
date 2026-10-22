import { randomBytes } from "node:crypto";
import { pool } from "../db/pool.ts";
import { hashToken } from "../auth/session.ts";

export type Manager = {
  id: number;
  name: string;
  username: string | null;
  email: string | null;
  isCommissioner: boolean;
};

export async function managerFromToken(token: string | null): Promise<Manager | null> {
  if (!token) return null;
  const result = await pool.query<{
    id: number;
    name: string;
    username: string | null;
    email: string | null;
    is_commissioner: boolean;
  }>(
    `SELECT u.id, COALESCE(u.username, u.name) AS name, u.username, u.email, u.is_commissioner
     FROM session s
     JOIN app_user u ON u.id = s.user_id
     WHERE s.token_hash = $1 AND s.expires_at > now()`,
    [hashToken(token)],
  );
  const row = result.rows[0];
  if (!row) return null;
  return { id: row.id, name: row.name, username: row.username, email: row.email, isCommissioner: row.is_commissioner };
}

async function table() {
  return pool.query<{ id: number; name: string; total: number; rank: number }>(
    `WITH totals AS (
       SELECT u.id, COALESCE(u.username, u.name) AS name, COALESCE(SUM(score.points), 0)::int AS total
       FROM app_user u
       LEFT JOIN manager_score score ON score.user_id = u.id
       GROUP BY u.id
     )
     SELECT id, name, total, RANK() OVER (ORDER BY total DESC, name)::int AS rank
     FROM totals
     ORDER BY rank, name`,
  );
}

export async function summaryFor(userId: number) {
  const rows = await table();
  const mine = rows.rows.find((row) => row.id === userId);
  return { totalPoints: mine?.total ?? 0, rank: mine?.rank ?? null, influence: 2 };
}

export async function slateFor(userId: number) {
  const rows = await table();
  const mine = rows.rows.find((row) => row.id === userId);
  const rank = mine?.rank ?? rows.rows.length;
  return {
    you: mine ?? null,
    rows: rows.rows.filter((row) => row.rank >= rank - 4 && row.rank <= rank + 4),
  };
}

export async function leaguesFor(userId: number) {
  const leagues = await pool.query<{ id: number; name: string; code: string }>(
    `SELECT league.id, league.name, league.code
     FROM fantasy_league league
     JOIN league_member member ON member.league_id = league.id
     WHERE member.user_id = $1
     ORDER BY league.name`,
    [userId],
  );
  const result = [];
  for (const league of leagues.rows) {
    const members = await pool.query<{ id: number; name: string; total: number; rank: number }>(
      `WITH totals AS (
         SELECT u.id, COALESCE(u.username, u.name) AS name, COALESCE(SUM(score.points), 0)::int AS total
         FROM league_member member
         JOIN app_user u ON u.id = member.user_id
         LEFT JOIN manager_score score ON score.user_id = u.id
         WHERE member.league_id = $1
         GROUP BY u.id
       )
       SELECT id, name, total, RANK() OVER (ORDER BY total DESC, name)::int AS rank
       FROM totals
       ORDER BY rank, name`,
      [league.id],
    );
    result.push({ ...league, members: members.rows });
  }
  return result;
}

export async function createLeague(userId: number, name: string) {
  const trimmed = name.trim();
  if (trimmed.length < 2 || trimmed.length > 40) return { error: "Choose a league name of 2 to 40 characters.", status: 400 };
  const code = randomBytes(3).toString("hex").toUpperCase();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const league = await client.query<{ id: number; name: string; code: string }>(
      `INSERT INTO fantasy_league (name, code, created_by) VALUES ($1, $2, $3) RETURNING id, name, code`,
      [trimmed, code, userId],
    );
    await client.query(`INSERT INTO league_member (league_id, user_id) VALUES ($1, $2)`, [league.rows[0].id, userId]);
    await client.query("COMMIT");
    return { league: league.rows[0] };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function joinLeague(userId: number, code: string) {
  const trimmed = code.trim().toUpperCase();
  if (!/^[A-Z0-9]{4,12}$/.test(trimmed)) return { error: "Enter the league code.", status: 400 };
  const league = await pool.query<{ id: number; name: string; code: string }>(
    `SELECT id, name, code FROM fantasy_league WHERE upper(code) = $1`,
    [trimmed],
  );
  if (!league.rows[0]) return { error: "No league uses that code.", status: 404 };
  await pool.query(
    `INSERT INTO league_member (league_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
    [league.rows[0].id, userId],
  );
  return { league: league.rows[0] };
}
