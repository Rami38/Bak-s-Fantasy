import type { Fixture } from "./types.ts";

const PARIS = "Europe/Paris";

export function statusLabel(status: string): string {
  if (status === "finished") return "Played";
  if (status === "live") return "Live";
  if (status === "scheduled") return "Upcoming";
  if (status === "postponed") return "Postponed";
  if (status === "cancelled") return "Cancelled";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export function fold(value: string): string {
  return value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

export function playerMatches(
  player: { name: string; club_name: string; club_short: string; position: string; shirt_number?: number | null },
  query: string,
): boolean {
  const needle = fold(query.trim());
  if (!needle) return true;
  const haystack = fold(
    `${player.name} ${player.club_name} ${player.club_short} ${player.position} ${player.shirt_number ?? ""}`,
  );
  return needle.split(/\s+/).every((part) => haystack.includes(part));
}

export function shortPlayerName(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length < 2) return name;
  const initial = parts[0].endsWith(".") ? parts[0] : `${parts[0].charAt(0)}.`;
  return `${initial} ${parts[parts.length - 1]}`;
}

export function activeMatchday(fixtures: Pick<Fixture, "matchday" | "kickoff">[], now: Date): number {
  if (fixtures.length === 0) return 1;
  const sorted = [...fixtures].sort((a, b) => new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime());
  const next = sorted.find((fixture) => new Date(fixture.kickoff).getTime() > now.getTime());
  return next ? next.matchday : sorted[sorted.length - 1].matchday;
}

export function firstKickoff(fixtures: Pick<Fixture, "kickoff">[]): Date | null {
  if (fixtures.length === 0) return null;
  return fixtures.reduce((earliest, fixture) => {
    const kickoff = new Date(fixture.kickoff);
    return kickoff < earliest ? kickoff : earliest;
  }, new Date(fixtures[0].kickoff));
}

export function money(tenths: number | null | undefined): string {
  if (tenths == null) return "—";
  return `€${(tenths / 10).toFixed(1)}m`;
}

export function lockLabel(matchday: number, kickoff: Date, timeZone = PARIS): string {
  const when = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(kickoff);
  return `GW${matchday} locks · ${when}`;
}

export function deadlineText(kickoff: Date, timeZone = PARIS): { when: string; rivalry: string } {
  const when = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(kickoff);
  const rivalry = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(kickoff.getTime() - 60 * 60 * 1000));
  return { when, rivalry };
}

export function kickoffParts(value: string, timeZone = PARIS): { day: string; time: string } {
  const date = new Date(value);
  const day = new Intl.DateTimeFormat("en-GB", { timeZone, weekday: "short" }).format(date);
  const time = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
  return { day: day.toUpperCase(), time };
}
