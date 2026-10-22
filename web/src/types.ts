export type Position = "goalkeeper" | "defender" | "midfielder" | "forward";

export type Person = {
  id: number;
  name: string;
  position: Position;
  club_name: string;
  club_short: string;
  age: number | null;
  nationality: string | null;
  shirt_number: number | null;
  price_tenths: number | null;
};

export type Fixture = {
  id: number;
  matchday: number;
  kickoff: string;
  status: string;
  home_goals: number | null;
  away_goals: number | null;
  home_name: string;
  home_short: string;
  away_name: string;
  away_short: string;
};

export type Page = "gameweek" | "squad" | "transfers" | "rivalry" | "leagues" | "rules";

export const FORMATIONS = ["4-4-2", "4-3-3", "3-5-2", "3-4-3", "5-3-2", "5-4-1", "4-5-1"] as const;
export type FormationId = (typeof FORMATIONS)[number];
