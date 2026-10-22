import type { FormationId, Person, Position } from "./types.ts";

export const SQUAD_CAP: Record<Position, number> = { goalkeeper: 2, defender: 5, midfielder: 5, forward: 3 };
const CAP = SQUAD_CAP;

const LINES: Record<FormationId, [number, number, number]> = {
  "4-4-2": [4, 4, 2],
  "4-3-3": [4, 3, 3],
  "3-5-2": [3, 5, 2],
  "3-4-3": [3, 4, 3],
  "5-3-2": [5, 3, 2],
  "5-4-1": [5, 4, 1],
  "4-5-1": [4, 5, 1],
};

export type Eleven = {
  goalkeeper: Person | null;
  defenders: Array<Person | null>;
  midfielders: Array<Person | null>;
  forwards: Array<Person | null>;
  bench: Array<Person | null>;
};

export function pickSquad(players: Person[]): Person[] {
  const byClub = new Map<string, Person[]>();
  for (const player of players) {
    const roster = byClub.get(player.club_short) ?? [];
    roster.push(player);
    byClub.set(player.club_short, roster);
  }
  const clubs = [...byClub.keys()].sort();
  const chosen: Person[] = [];
  const counts: Record<Position, number> = { goalkeeper: 0, defender: 0, midfielder: 0, forward: 0 };
  const clubCount = new Map<string, number>();
  let added = true;
  while (chosen.length < 15 && added) {
    added = false;
    for (const club of clubs) {
      if ((clubCount.get(club) ?? 0) >= 3) continue;
      const player = (byClub.get(club) ?? []).find(
        (candidate) => !chosen.some((picked) => picked.id === candidate.id) && counts[candidate.position] < CAP[candidate.position],
      );
      if (!player) continue;
      chosen.push(player);
      counts[player.position] += 1;
      clubCount.set(club, (clubCount.get(club) ?? 0) + 1);
      added = true;
      if (chosen.length >= 15) break;
    }
  }
  return chosen;
}

export function startingEleven(squad: Person[], formation: FormationId): Eleven {
  const [defenders, midfielders, forwards] = LINES[formation];
  const used = new Set<number>();
  const take = (position: Position, count: number) => {
    const found = squad.filter((player) => player.position === position && !used.has(player.id)).slice(0, count);
    for (const player of found) used.add(player.id);
    const slots: Array<Person | null> = [...found];
    while (slots.length < count) slots.push(null);
    return slots;
  };
  const goalkeepers = take("goalkeeper", 1);
  const defs = take("defender", defenders);
  const mids = take("midfielder", midfielders);
  const fwds = take("forward", forwards);
  const bench: Array<Person | null> = squad.filter((player) => !used.has(player.id)).slice(0, 4);
  while (bench.length < 4) bench.push(null);
  return {
    goalkeeper: goalkeepers[0] ?? null,
    defenders: defs,
    midfielders: mids,
    forwards: fwds,
    bench,
  };
}

export function signPlayer(squad: Person[], incoming: Person, outgoingId: number | null): Person[] | null {
  if (squad.some((player) => player.id === incoming.id)) return null;
  const outgoing = outgoingId === null ? null : (squad.find((player) => player.id === outgoingId) ?? null);
  if (outgoingId !== null && !outgoing) return null;
  if (outgoing && outgoing.position !== incoming.position) return null;
  const held = squad.filter((player) => player.position === incoming.position).length;
  if (!outgoing && held >= CAP[incoming.position]) return null;
  const next = outgoing ? squad.map((player) => (player.id === outgoing.id ? incoming : player)) : [...squad, incoming];
  const clubs = new Map<string, number>();
  const counts: Record<Position, number> = { goalkeeper: 0, defender: 0, midfielder: 0, forward: 0 };
  for (const player of next) {
    const count = (clubs.get(player.club_short) ?? 0) + 1;
    if (count > 3) return null;
    clubs.set(player.club_short, count);
    counts[player.position] += 1;
  }
  if (counts.goalkeeper > 2 || counts.defender > 5 || counts.midfielder > 5 || counts.forward > 3) return null;
  return next;
}

export function replacePlayer(squad: Person[], outgoingId: number, incoming: Person): Person[] | null {
  const outgoing = squad.find((player) => player.id === outgoingId);
  if (!outgoing || outgoing.position !== incoming.position) return null;
  if (squad.some((player) => player.id === incoming.id)) return null;
  const next = squad.map((player) => (player.id === outgoingId ? incoming : player));
  const clubs = new Map<string, number>();
  for (const player of next) {
    const count = (clubs.get(player.club_short) ?? 0) + 1;
    if (count > 3) return null;
    clubs.set(player.club_short, count);
  }
  return next;
}

export function onPitch(eleven: Eleven, playerId: number): boolean {
  return [eleven.goalkeeper, ...eleven.defenders, ...eleven.midfielders, ...eleven.forwards].some(
    (player) => player?.id === playerId,
  );
}
