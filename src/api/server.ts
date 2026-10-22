import http from "node:http";
import { setUsername, signIn, signOut, signUp } from "../auth/accounts.ts";
import { clearSessionCookie, readSessionToken, sessionCookie } from "../auth/session.ts";
import { loadSquad, parseSquadInput, saveSquad } from "../db/squadStore.ts";
import { createLeague, joinLeague, leaguesFor, managerFromToken, slateFor, summaryFor } from "./office.ts";
import { config } from "../config.ts";
import { pool } from "../db/pool.ts";

async function seasonId(): Promise<number | null> {
  const result = await pool.query<{ id: number }>("SELECT id FROM season WHERE name = $1", [config.seasonName]);
  return result.rows[0]?.id ?? null;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", "http://localhost");
  try {
    if (req.method === "GET" && url.pathname === "/api/me") {
      const manager = await managerFromToken(readSessionToken(req.headers.cookie));
      return send(res, 200, manager ? { name: manager.name, username: manager.username, email: manager.email, isCommissioner: manager.isCommissioner } : null);
    }

    if (req.method === "GET" && url.pathname === "/api/squad") {
      const manager = await managerFromToken(readSessionToken(req.headers.cookie));
      if (!manager) return send(res, 401, { error: "Sign in first." });
      const id = await seasonId();
      if (!id) return send(res, 404, { error: "The season is not ready." });
      const squad = await loadSquad(manager.id, id, manager.id);
      return send(res, squad ? 200 : 404, squad ?? { error: "Squad not found." });
    }

    if (req.method === "PUT" && url.pathname === "/api/squad") {
      const manager = await managerFromToken(readSessionToken(req.headers.cookie));
      if (!manager) return send(res, 401, { error: "Sign in first." });
      const id = await seasonId();
      if (!id) return send(res, 404, { error: "The season is not ready." });
      const parsed = parseSquadInput(await readUnknown(req));
      if ("error" in parsed) return send(res, parsed.status, { error: parsed.error });
      const result = await saveSquad(manager.id, id, parsed);
      if ("error" in result) return send(res, result.status, { error: result.error });
      return send(res, 200, await loadSquad(manager.id, id, manager.id));
    }

    const managerSquad = url.pathname.match(/^\/api\/managers\/(\d+)\/squad$/);
    if (req.method === "GET" && managerSquad) {
      const manager = await managerFromToken(readSessionToken(req.headers.cookie));
      if (!manager) return send(res, 401, { error: "Sign in first." });
      const id = await seasonId();
      if (!id) return send(res, 404, { error: "The season is not ready." });
      const squad = await loadSquad(Number(managerSquad[1]), id, manager.id);
      if (!squad) return send(res, 404, { error: "That manager is not at the table." });
      return send(res, 200, squad);
    }

    if (req.method === "GET" && url.pathname === "/api/summary") {
      const manager = await managerFromToken(readSessionToken(req.headers.cookie));
      if (!manager) return send(res, 401, { error: "Sign in first." });
      return send(res, 200, await summaryFor(manager.id));
    }

    if (req.method === "GET" && url.pathname === "/api/slate") {
      const manager = await managerFromToken(readSessionToken(req.headers.cookie));
      if (!manager) return send(res, 401, { error: "Sign in first." });
      return send(res, 200, await slateFor(manager.id));
    }

    if (req.method === "GET" && url.pathname === "/api/leagues") {
      const manager = await managerFromToken(readSessionToken(req.headers.cookie));
      if (!manager) return send(res, 401, { error: "Sign in first." });
      return send(res, 200, await leaguesFor(manager.id));
    }

    if (req.method === "POST" && url.pathname === "/api/leagues") {
      const manager = await managerFromToken(readSessionToken(req.headers.cookie));
      if (!manager) return send(res, 401, { error: "Sign in first." });
      const body = await readJson(req);
      const result = await createLeague(manager.id, typeof body.name === "string" ? body.name : "");
      if ("error" in result) return send(res, result.status ?? 400, { error: result.error });
      return send(res, 200, result.league);
    }

    if (req.method === "POST" && url.pathname === "/api/leagues/join") {
      const manager = await managerFromToken(readSessionToken(req.headers.cookie));
      if (!manager) return send(res, 401, { error: "Sign in first." });
      const body = await readJson(req);
      const result = await joinLeague(manager.id, typeof body.code === "string" ? body.code : "");
      if ("error" in result) return send(res, result.status ?? 400, { error: result.error });
      return send(res, 200, result.league);
    }

    if (req.method === "POST" && url.pathname === "/api/username") {
      const manager = await managerFromToken(readSessionToken(req.headers.cookie));
      if (!manager) return send(res, 401, { error: "Sign in first." });
      const body = await readJson(req);
      const result = await setUsername(manager.id, typeof body.username === "string" ? body.username : "");
      if ("error" in result) return send(res, result.status, { error: result.error });
      return send(res, 200, result.manager);
    }

    if (req.method === "POST" && (url.pathname === "/api/sign-up" || url.pathname === "/api/sign-in")) {
      const body = await readJson(req);
      const name = typeof body.name === "string" ? body.name : "";
      const username = typeof body.username === "string" ? body.username : name;
      const email = typeof body.email === "string" ? body.email : "";
      const password = typeof body.password === "string" ? body.password : "";
      const result = url.pathname === "/api/sign-up" ? await signUp(username, email, password) : await signIn(name, password);
      if ("error" in result) return send(res, result.status, { error: result.error });
      return send(res, 200, result.manager, { "Set-Cookie": sessionCookie(result.token) });
    }

    if (req.method === "POST" && url.pathname === "/api/sign-out") {
      await signOut(readSessionToken(req.headers.cookie));
      return send(res, 200, null, { "Set-Cookie": clearSessionCookie() });
    }

    if (url.pathname === "/api/season") {
      const result = await pool.query(
        "SELECT name, matchday_count FROM season WHERE name = $1",
        [config.seasonName],
      );
      return send(res, 200, result.rows[0] ?? null);
    }

    const id = await seasonId();
    if (url.pathname === "/api/clubs") {
      if (!id) return send(res, 200, []);
      const result = await pool.query(
        `SELECT c.id, c.name, c.short_name, COUNT(s.id)::int AS player_count
         FROM club c
         LEFT JOIN player_club_stint s ON s.club_id = c.id
         WHERE c.season_id = $1
         GROUP BY c.id
         ORDER BY c.name`,
        [id],
      );
      return send(res, 200, result.rows);
    }

    if (url.pathname === "/api/players") {
      if (!id) return send(res, 200, []);
      const result = await pool.query(
        `SELECT p.id, p.name, p.position, p.age, p.nationality, p.shirt_number,
                c.name AS club_name, c.short_name AS club_short, s.price_tenths
         FROM player p
         JOIN player_club_stint s ON s.player_id = p.id
         JOIN club c ON c.id = s.club_id
         WHERE s.season_id = $1
         ORDER BY p.name`,
        [id],
      );
      return send(res, 200, result.rows);
    }

    const profile = url.pathname.match(/^\/api\/players\/(\d+)$/);
    if (profile) {
      const result = await pool.query(
        `SELECT p.id, p.name, p.position, p.age, p.nationality, p.shirt_number,
                c.name AS club_name, c.short_name AS club_short, s.price_tenths
         FROM player p
         JOIN player_club_stint s ON s.player_id = p.id
         JOIN club c ON c.id = s.club_id
         WHERE p.id = $1`,
        [Number(profile[1])],
      );
      return send(res, result.rows[0] ? 200 : 404, result.rows[0] ?? { error: "Player not found." });
    }

    const players = url.pathname.match(/^\/api\/clubs\/(\d+)\/players$/);
    if (players) {
      const result = await pool.query(
        `SELECT p.name, p.position
         FROM player p
         JOIN player_club_stint s ON s.player_id = p.id
         WHERE s.club_id = $1
         ORDER BY CASE p.position
           WHEN 'goalkeeper' THEN 1
           WHEN 'defender' THEN 2
           WHEN 'midfielder' THEN 3
           ELSE 4
         END, p.name`,
        [Number(players[1])],
      );
      return send(res, 200, result.rows);
    }

    if (url.pathname === "/api/fixtures") {
      if (!id) return send(res, 200, []);
      const matchday = url.searchParams.get("matchday");
      const result = await pool.query(
        `SELECT f.id, f.matchday, f.kickoff, f.status, f.home_goals, f.away_goals,
                h.name AS home_name, h.short_name AS home_short,
                a.name AS away_name, a.short_name AS away_short
         FROM fixture f
         JOIN club h ON h.id = f.home_club_id
         JOIN club a ON a.id = f.away_club_id
         WHERE f.season_id = $1 AND ($2::int IS NULL OR f.matchday = $2)
         ORDER BY f.kickoff`,
        [id, matchday ? Number(matchday) : null],
      );
      return send(res, 200, result.rows);
    }

    send(res, 404, { error: "Not found" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Request failed";
    send(res, 500, { error: message });
  }
});

async function readUnknown(req: http.IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk));
  if (chunks.length === 0) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
}

async function readJson(req: http.IncomingMessage): Promise<{ name?: unknown; password?: unknown; username?: unknown; email?: unknown; code?: unknown }> {
  const parsed = await readUnknown(req);
  if (typeof parsed !== "object" || parsed === null) return {};
  return parsed as { name?: unknown; password?: unknown; username?: unknown; email?: unknown; code?: unknown };
}

function send(res: http.ServerResponse, status: number, body: unknown, extra: Record<string, string> = {}) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "http://localhost:5173",
    "Access-Control-Allow-Credentials": "true",
    ...extra,
  });
  res.end(JSON.stringify(body));
}

server.listen(config.port, () => {
  console.log(`API listening on http://localhost:${config.port}`);
});
