import "dotenv/config";

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Missing ${name}. Copy .env.example to .env and fill it in.`);
  }
  return value;
}

export const config = {
  databaseUrl: required("DATABASE_URL", process.env.DATABASE_URL),
  apiKey: process.env.API_FOOTBALL_KEY ?? "",
  footballDataToken: process.env.FOOTBALL_DATA_TOKEN ?? "",
  leagueId: Number(process.env.LEAGUE_ID ?? 61),
  seasonYear: Number(process.env.SEASON ?? 2024),
  seasonName: "2026/27",
  port: Number(process.env.PORT ?? 3001),
};
