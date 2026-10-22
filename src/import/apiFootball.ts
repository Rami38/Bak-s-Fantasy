const BASE = "https://v3.football.api-sports.io";

type Envelope<T> = {
  errors: unknown;
  response: T;
};

export type TeamRow = {
  team: { id: number; name: string; code: string | null };
};

export type SquadRow = {
  team: { id: number };
  players: Array<{ id: number; name: string; age: number | null; number: number | null; position: string | null }>;
};

export type FixtureRow = {
  fixture: { id: number; date: string; status: { short: string } };
  league: { round: string };
  teams: {
    home: { id: number; name: string };
    away: { id: number; name: string };
  };
};

export class ApiFootball {
  requests = 0;

  constructor(private readonly apiKey: string) {}

  private async get<T>(path: string, attempt = 1): Promise<T> {
    this.requests += 1;
    const response = await fetch(`${BASE}${path}`, {
      headers: { "x-apisports-key": this.apiKey },
    });
    if (response.status === 429 && attempt < 4) {
      await new Promise((resolve) => setTimeout(resolve, 15000));
      return this.get(path, attempt + 1);
    }
    if (!response.ok) {
      throw new Error(`API-Football returned HTTP ${response.status} for ${path}`);
    }
    const body = (await response.json()) as Envelope<T>;
    const errors = body.errors;
    const errorText = JSON.stringify(errors ?? "");
    const rateLimited = errorText.includes("rateLimit") || errorText.includes("Too many requests");
    if (rateLimited && attempt < 4) {
      await new Promise((resolve) => setTimeout(resolve, 60000));
      return this.get(path, attempt + 1);
    }
    const hasErrors = Array.isArray(errors)
      ? errors.length > 0
      : Boolean(errors) && Object.keys(errors as object).length > 0;
    if (hasErrors) {
      throw new Error(`API-Football refused the request: ${JSON.stringify(errors)}`);
    }
    return body.response;
  }

  teams(leagueId: number, season: number) {
    return this.get<TeamRow[]>(`/teams?league=${leagueId}&season=${season}`);
  }

  searchTeams(name: string) {
    return this.get<TeamRow[]>(`/teams?search=${encodeURIComponent(name)}`);
  }

  squad(teamId: number) {
    return this.get<SquadRow[]>(`/players/squads?team=${teamId}`);
  }

  fixtures(leagueId: number, season: number) {
    return this.get<FixtureRow[]>(`/fixtures?league=${leagueId}&season=${season}`);
  }
}
