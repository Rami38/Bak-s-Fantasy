export type FootballDataTeam = {
  id: number;
  name: string;
  shortName: string;
  tla: string;
};

export type FootballDataMatch = {
  id: number;
  utcDate: string;
  status: string;
  matchday: number | null;
  homeTeam: FootballDataTeam;
  awayTeam: FootballDataTeam;
  score?: { fullTime?: { home: number | null; away: number | null } };
};

type MatchesResponse = {
  matches?: FootballDataMatch[];
  message?: string;
};

export async function loadLigue1Matches(token: string): Promise<FootballDataMatch[]> {
  const response = await fetch("https://api.football-data.org/v4/competitions/FL1/matches", {
    headers: { "X-Auth-Token": token },
  });
  const body = (await response.json()) as MatchesResponse;
  if (!response.ok || !body.matches) {
    throw new Error(body.message ?? `football-data.org returned HTTP ${response.status}`);
  }
  return body.matches;
}
