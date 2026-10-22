import { pool } from "./pool.ts";

const FORMATIONS = new Set(["4-4-2", "4-3-3", "3-5-2", "3-4-3", "5-3-2", "5-4-1", "4-5-1"]);
const CAP = { goalkeeper: 2, defender: 5, midfielder: 5, forward: 3 } as const;
const BUDGET = 1000;

export type SquadPlayerRow = {
  id: number;
  name: string;
  position: string;
  club_name: string;
  club_short: string;
  age: number | null;
  nationality: string | null;
  shirt_number: number | null;
  price_tenths: number | null;
};

export type SquadView = {
  manager: { id: number; name: string };
  isYou: boolean;
  formation: string;
  captainId: number | null;
  viceId: number | null;
  players: SquadPlayerRow[];
};

export type SquadInput = {
  playerIds: number[];
  formation: string;
  captainId: number | null;
  viceId: number | null;
};

type Failure = { error: string; status: number };

function asIds(value: unknown): number[] {
  if (Array.isArray(value)) return value.map((item) => Number(item)).filter((item) => Number.isInteger(item));
  if (typeof value !== "string") return [];
  const inner = value.trim().replace(/^\{|\}$/g, "");
  if (!inner) return [];
  return inner.split(",").map((part) => Number(part.trim())).filter((item) => Number.isInteger(item));
}

function readId(value: unknown): number | null | undefined {
  if (value === null || value === undefined) return null;
  if (typeof value === "number" && Number.isInteger(value)) return value;
  return undefined;
}

export function parseSquadInput(body: unknown): SquadInput | Failure {
  if (typeof body !== "object" || body === null) return { error: "The squad could not be read.", status: 400 };
  const raw = body as { playerIds?: unknown; formation?: unknown; captainId?: unknown; viceId?: unknown };
  if (!Array.isArray(raw.playerIds) || raw.playerIds.length > 15) {
    return { error: "A squad holds at most 15 players.", status: 400 };
  }
  const playerIds: number[] = [];
  for (const id of raw.playerIds) {
    if (typeof id !== "number" || !Number.isInteger(id) || playerIds.includes(id)) {
      return { error: "The squad could not be read.", status: 400 };
    }
    playerIds.push(id);
  }
  if (typeof raw.formation !== "string" || !FORMATIONS.has(raw.formation)) {
    return { error: "Choose a formation.", status: 400 };
  }
  const captainId = readId(raw.captainId);
  const viceId = readId(raw.viceId);
  if (captainId === undefined || viceId === undefined) {
    return { error: "Choose the captain and vice from the squad.", status: 400 };
  }
  if (playerIds.length === 0) return { playerIds, formation: raw.formation, captainId: null, viceId: null };
  if (captainId !== null && !playerIds.includes(captainId)) {
    return { error: "Choose a captain from the squad.", status: 400 };
  }
  if (viceId !== null && !playerIds.includes(viceId)) {
    return { error: "Choose a vice-captain from the squad.", status: 400 };
  }
  return { playerIds, formation: raw.formation, captainId, viceId };
}

export async function saveSquad(userId: number, seasonId: number, input: SquadInput): Promise<{ ok: true } | Failure> {
  const parsed = parseSquadInput(input);
  if ("error" in parsed) return parsed;
  if (parsed.playerIds.length > 0) {
    const roster = await pool.query<{ id: number; position: keyof typeof CAP; club_id: number; price_tenths: number | null }>(
      `SELECT p.id, p.position, s.club_id, s.price_tenths
       FROM player p
       JOIN player_club_stint s ON s.player_id = p.id AND s.season_id = $1
       WHERE p.id = ANY($2::int[])`,
      [seasonId, parsed.playerIds],
    );
    if (roster.rows.length !== parsed.playerIds.length) {
      return { error: "One of those players is not in this season.", status: 400 };
    }
    const counts = { goalkeeper: 0, defender: 0, midfielder: 0, forward: 0 };
    const clubs = new Map<number, number>();
    let total = 0;
    for (const row of roster.rows) {
      if (!(row.position in counts)) return { error: "One of those players is not in this season.", status: 400 };
      counts[row.position] += 1;
      clubs.set(row.club_id, (clubs.get(row.club_id) ?? 0) + 1);
      if (row.price_tenths == null) return { error: "A player is missing a price.", status: 400 };
      total += row.price_tenths;
    }
    if (counts.goalkeeper > CAP.goalkeeper || counts.defender > CAP.defender || counts.midfielder > CAP.midfielder || counts.forward > CAP.forward) {
      return { error: "That squad breaks the position limits.", status: 400 };
    }
    if ([...clubs.values()].some((count) => count > 3)) {
      return { error: "At most three players from one club.", status: 400 };
    }
    if (total > BUDGET) return { error: "That squad spends more than €100.0m.", status: 400 };
  }

  await pool.query(
    `INSERT INTO manager_squad (user_id, season_id, player_ids, formation, captain_id, vice_id, updated_at)
     VALUES ($1, $2, $3::int[], $4, $5, $6, now())
     ON CONFLICT (user_id, season_id) DO UPDATE
     SET player_ids = EXCLUDED.player_ids,
         formation = EXCLUDED.formation,
         captain_id = EXCLUDED.captain_id,
         vice_id = EXCLUDED.vice_id,
         updated_at = now()`,
    [userId, seasonId, parsed.playerIds, parsed.formation, parsed.captainId, parsed.viceId],
  );
  return { ok: true };
}

export async function loadSquad(userId: number, seasonId: number, viewerId: number): Promise<SquadView | null> {
  const manager = await pool.query<{ id: number; name: string }>(
    `SELECT id, COALESCE(username, name) AS name FROM app_user WHERE id = $1`,
    [userId],
  );
  if (!manager.rows[0]) return null;
  const squad = await pool.query<{ formation: string; captain_id: number | null; vice_id: number | null; player_ids: unknown }>(
    `SELECT formation, captain_id, vice_id, player_ids
     FROM manager_squad
     WHERE user_id = $1 AND season_id = $2`,
    [userId, seasonId],
  );
  const row = squad.rows[0];
  const playerIds = asIds(row?.player_ids);
  const players = playerIds.length
    ? (
        await pool.query<SquadPlayerRow>(
          `SELECT p.id, p.name, p.position, p.age, p.nationality, p.shirt_number,
                  c.name AS club_name, c.short_name AS club_short, s.price_tenths
           FROM unnest($2::int[]) WITH ORDINALITY AS picked(player_id, ordinality)
           JOIN player p ON p.id = picked.player_id
           JOIN player_club_stint s ON s.player_id = p.id AND s.season_id = $1
           JOIN club c ON c.id = s.club_id
           ORDER BY picked.ordinality`,
          [seasonId, playerIds],
        )
      ).rows.map((player) => ({
        ...player,
        id: Number(player.id),
        age: player.age == null ? null : Number(player.age),
        shirt_number: player.shirt_number == null ? null : Number(player.shirt_number),
        price_tenths: player.price_tenths == null ? null : Number(player.price_tenths),
      }))
    : [];
  return {
    manager: { id: Number(manager.rows[0].id), name: manager.rows[0].name },
    isYou: userId === viewerId,
    formation: row?.formation && FORMATIONS.has(row.formation) ? row.formation : "4-3-3",
    captainId: row?.captain_id == null ? null : Number(row.captain_id),
    viceId: row?.vice_id == null ? null : Number(row.vice_id),
    players,
  };
}
