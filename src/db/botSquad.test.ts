import assert from "node:assert/strict";
import test from "node:test";
import { buildBotSquad, FORMATIONS, type SquadPlayer } from "./botSquad.ts";

function pool(): SquadPlayer[] {
  const players: SquadPlayer[] = [];
  let id = 1;
  for (let clubId = 1; clubId <= 18; clubId += 1) {
    const add = (position: SquadPlayer["position"], count: number, base: number) => {
      for (let index = 0; index < count; index += 1) {
        players.push({ id, position, clubId, priceTenths: base + index * 8 + (clubId % 5) });
        id += 1;
      }
    };
    add("goalkeeper", 2, 40);
    add("defender", 6, 42);
    add("midfielder", 6, 50);
    add("forward", 4, 60);
  }
  return players;
}

test("bot squads stay inside the caps, the budget, and differ by manager", () => {
  const players = pool();
  const squads = [1, 2, 3, 4, 5, 6, 7, 8].map((salt) => buildBotSquad(players, salt));
  for (const squad of squads) {
    assert.equal(squad.playerIds.length, 15);
    assert.equal(new Set(squad.playerIds).size, 15);
    assert.ok(FORMATIONS.includes(squad.formation));
    assert.ok(squad.captainId != null && squad.playerIds.includes(squad.captainId));
    assert.ok(squad.viceId != null && squad.playerIds.includes(squad.viceId));
    assert.notEqual(squad.captainId, squad.viceId);
    const chosen = squad.playerIds.map((id) => players.find((player) => player.id === id)!);
    const counts = { goalkeeper: 0, defender: 0, midfielder: 0, forward: 0 };
    const clubs = new Map<number, number>();
    let total = 0;
    for (const player of chosen) {
      counts[player.position] += 1;
      clubs.set(player.clubId, (clubs.get(player.clubId) ?? 0) + 1);
      total += player.priceTenths;
    }
    assert.deepEqual(counts, { goalkeeper: 2, defender: 5, midfielder: 5, forward: 3 });
    assert.ok([...clubs.values()].every((count) => count <= 3));
    assert.ok(total <= 1000);
  }
  assert.notDeepEqual(squads[0].playerIds, squads[1].playerIds);
});
