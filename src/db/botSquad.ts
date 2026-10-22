export const FORMATIONS = ["4-4-2", "4-3-3", "3-5-2", "3-4-3", "5-3-2", "5-4-1", "4-5-1"] as const;
export type FormationName = (typeof FORMATIONS)[number];

export type SquadPlayer = {
  id: number;
  position: "goalkeeper" | "defender" | "midfielder" | "forward";
  clubId: number;
  priceTenths: number;
};

const POSITIONS = ["goalkeeper", "defender", "midfielder", "forward"] as const;
const NEED: Record<SquadPlayer["position"], number> = { goalkeeper: 2, defender: 5, midfielder: 5, forward: 3 };
const BUDGET = 1000;

export type BuiltSquad = {
  playerIds: number[];
  formation: FormationName;
  captainId: number | null;
  viceId: number | null;
};

function rotate<T>(items: T[], shift: number): T[] {
  if (items.length === 0) return [];
  const offset = Math.abs(shift) % items.length;
  return [...items.slice(offset), ...items.slice(0, offset)];
}

export function buildBotSquad(players: SquadPlayer[], salt: number): BuiltSquad {
  const usable = players.filter((player) => player.priceTenths > 0 && NEED[player.position] != null);
  const clubs = [...new Set(usable.map((player) => player.clubId))].sort((a, b) => a - b);
  const clubOrder = rotate(clubs, salt);
  const minPrice: Record<SquadPlayer["position"], number> = {
    goalkeeper: 0,
    defender: 0,
    midfielder: 0,
    forward: 0,
  };
  for (const position of POSITIONS) {
    const prices = usable
      .filter((player) => player.position === position)
      .map((player) => player.priceTenths)
      .sort((a, b) => a - b);
    minPrice[position] = prices[0] ?? 0;
  }

  const chosen: SquadPlayer[] = [];
  const clubCount = new Map<number, number>();
  const still: Record<SquadPlayer["position"], number> = { ...NEED };

  function spent(): number {
    return chosen.reduce((sum, player) => sum + player.priceTenths, 0);
  }

  function reserve(): number {
    return POSITIONS.reduce((sum, position) => sum + still[position] * minPrice[position], 0);
  }

  for (const position of POSITIONS) {
    let guard = 0;
    while (still[position] > 0 && guard < 80) {
      guard += 1;
      let picked = false;
      for (const clubId of clubOrder) {
        if ((clubCount.get(clubId) ?? 0) >= 3) continue;
        const options = usable
          .filter(
            (player) =>
              player.position === position &&
              player.clubId === clubId &&
              !chosen.some((item) => item.id === player.id),
          )
          .sort((a, b) => b.priceTenths - a.priceTenths || a.id - b.id);
        if (options.length === 0) continue;
        const rank = Math.abs(salt + clubId) % options.length;
        const preferred = [...options.slice(rank), ...options.slice(0, rank)];
        const attempt = [...preferred, ...[...options].sort((a, b) => a.priceTenths - b.priceTenths)];
        for (const player of attempt) {
          const reserved = reserve() - minPrice[position];
          if (spent() + player.priceTenths + reserved > BUDGET) continue;
          chosen.push(player);
          clubCount.set(clubId, (clubCount.get(clubId) ?? 0) + 1);
          still[position] -= 1;
          picked = true;
          break;
        }
        if (picked) break;
      }
      if (!picked) break;
    }
  }

  const ordered: SquadPlayer[] = [];
  for (const position of POSITIONS) {
    ordered.push(
      ...chosen
        .filter((player) => player.position === position)
        .sort((a, b) => b.priceTenths - a.priceTenths || a.id - b.id),
    );
  }
  const captain = ordered.find((player) => player.position === "forward") ?? ordered.find((player) => player.position === "midfielder") ?? null;
  const vice = ordered.find((player) => player.position === "defender" && player.id !== captain?.id) ?? null;
  return {
    playerIds: ordered.map((player) => player.id),
    formation: FORMATIONS[Math.abs(salt) % FORMATIONS.length],
    captainId: captain?.id ?? null,
    viceId: vice?.id ?? null,
  };
}
