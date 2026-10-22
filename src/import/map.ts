export type Position = "goalkeeper" | "defender" | "midfielder" | "forward";
export type FixtureStatus = "scheduled" | "live" | "finished" | "postponed" | "cancelled";

export function mapPosition(raw: string | null | undefined): Position | null {
  const value = (raw ?? "").trim().toLowerCase();
  if (value === "goalkeeper") return "goalkeeper";
  if (value === "defender") return "defender";
  if (value === "midfielder") return "midfielder";
  if (value === "attacker" || value === "forward") return "forward";
  return null;
}

export function mapStatus(short: string): FixtureStatus {
  const code = short.toUpperCase();
  if (code === "FT" || code === "AET" || code === "PEN") return "finished";
  if (["1H", "HT", "2H", "ET", "BT", "P", "LIVE", "INT"].includes(code)) return "live";
  if (code === "PST" || code === "SUSP") return "postponed";
  if (code === "CANC" || code === "ABD" || code === "AWD" || code === "WO") return "cancelled";
  return "scheduled";
}

export function matchdayFromRound(round: string): number | null {
  const match = round.match(/(\d+)\s*$/);
  if (!match) return null;
  const matchday = Number(match[1]);
  if (matchday < 1 || matchday > 34) return null;
  return matchday;
}

export function mapFootballStatus(status: string): FixtureStatus {
  const code = status.toUpperCase();
  if (code === "FINISHED" || code === "AWARDED") return "finished";
  if (code === "IN_PLAY" || code === "PAUSED") return "live";
  if (code === "POSTPONED" || code === "SUSPENDED") return "postponed";
  if (code === "CANCELLED") return "cancelled";
  return "scheduled";
}

export function normalizeName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const CLUB_ALIASES: Record<string, string> = {
  "aj auxerre": "auxerre",
  "as monaco fc": "monaco",
  "angers sco": "angers",
  "es troyes ac": "troyes",
  "fc lorient": "lorient",
  "le havre ac": "le havre",
  "le mans fc": "le mans",
  "lille osc": "lille",
  "ogc nice": "nice",
  "olympique lyonnais": "lyon",
  "olympique de marseille": "marseille",
  "paris fc": "paris fc",
  "paris saint germain fc": "paris saint germain",
  "rc strasbourg alsace": "strasbourg",
  "racing club de lens": "lens",
  "stade brestois 29": "stade brestois 29",
  "stade rennais fc 1901": "rennes",
  "toulouse fc": "toulouse",
};

export function canonicalClubName(name: string): string {
  const key = normalizeName(name);
  return CLUB_ALIASES[key] ?? key;
}

export function shortName(code: string | null | undefined, name: string): string {
  const trimmed = (code ?? "").trim();
  if (trimmed) return trimmed.slice(0, 3).toUpperCase();
  return name.replace(/[^A-Za-z]/g, "").slice(0, 3).toUpperCase();
}
