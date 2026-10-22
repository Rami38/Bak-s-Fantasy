# Bak's Fantasy

Bak's Fantasy is a Ligue 1 fantasy game for the 2026/27 season. You build one squad of 15, set a lineup, and meet the managers ranked just around you each week. Private leagues rank that same squad by match points.

The game runs on your own machine. Accounts, squads, and fixtures stay in a local Postgres database.

## Squad

- 2 goalkeepers, 5 defenders, 5 midfielders, 3 forwards
- A budget of €100.0m, with at most 3 players from one club
- Formations: 4-4-2, 4-3-3, 3-5-2, 3-4-3, 5-3-2, 5-4-1, 4-5-1
- The captain scores double. The vice-captain scores double only if the captain plays 0 minutes
- One free transfer each gameweek, then −4 points

A new manager starts with an empty squad and the full budget. The prices in the game are estimates, so the market has something to show until real prices are set.

## Run it

You need Node.js 22, Docker, and two free API keys: one from [API-Football](https://www.api-football.com/) and one from [football-data.org](https://www.football-data.org/).

```powershell
cd C:\Users\Yacoub\Documents\Transfermarkt
copy .env.example .env
npm install
npm run db:up
npm run db:migrate
npm run db:seed
```

Put the keys in `.env`. That file is not in this repository.

```text
API_FOOTBALL_KEY=your-key
FOOTBALL_DATA_TOKEN=your-token
```

Start the API and the site in two terminals:

```powershell
npm run api
npm run web
```

Open http://localhost:5173.

`npm run db:seed` loads sample prices, match scores, and eight bot managers so the leagues and the slate have people in them. Their shared password is `pitch-day`.

## Where the data comes from

API-Football supplies the current squads: name, age, shirt number, and position. football-data.org supplies the 2026/27 fixtures and scores. The free plans do not include player photographs, country, match lineups, or player statistics for this season, so the site shows only what those feeds provide.

## Tests

```powershell
npm test
```
