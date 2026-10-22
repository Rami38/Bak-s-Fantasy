import assert from "node:assert/strict";
import test from "node:test";
import { activeMatchday, playerMatches, shortPlayerName, statusLabel } from "./format.ts";
import { pickSquad, replacePlayer, signPlayer, startingEleven } from "./lineup.ts";
import type { Person } from "./types.ts";

test("status words match the ledger", () => {
  assert.equal(statusLabel("finished"), "Played");
  assert.equal(statusLabel("live"), "Live");
  assert.equal(statusLabel("scheduled"), "Upcoming");
});

test("shortens a full name and keeps an initial", () => {
  assert.equal(shortPlayerName("Ousmane Dembélé"), "O. Dembélé");
  assert.equal(shortPlayerName("K. Trapp"), "K. Trapp");
  assert.equal(shortPlayerName("C. Mawissa Elebi"), "C. Elebi");
});

test("search ignores case, accents, and every part of the name", () => {
  const player = { name: "D. Doué", club_name: "Paris Saint Germain", club_short: "PSG", position: "forward" as const };
  assert.equal(playerMatches(player, "doue"), true);
  assert.equal(playerMatches(player, "PSG"), true);
  assert.equal(playerMatches(player, "paris forward"), true);
  assert.equal(playerMatches(player, "zzz"), false);
});

test("picks the matchday of the next kickoff", () => {
  const fixtures = [
    { matchday: 7, kickoff: "2026-10-04T19:00:00.000Z" },
    { matchday: 8, kickoff: "2026-10-16T18:45:00.000Z" },
  ];
  assert.equal(activeMatchday(fixtures, new Date("2026-10-14T12:00:00.000Z")), 8);
  assert.equal(activeMatchday(fixtures, new Date("2026-10-20T12:00:00.000Z")), 8);
});

function person(id: number, position: Person["position"], club: string): Person {
  return {
    id,
    name: `Player ${id}`,
    position,
    club_name: club,
    club_short: club,
    age: null,
    nationality: null,
    shirt_number: null,
    price_tenths: 50,
  };
}

test("builds a 15-man squad within the position and club caps", () => {
  const players: Person[] = [];
  let id = 1;
  for (const club of ["PSG", "MAR", "LYO", "LIL", "REN", "NIC"]) {
    for (let count = 0; count < 3; count += 1) players.push(person(id++, "goalkeeper", club));
    for (let count = 0; count < 6; count += 1) players.push(person(id++, "defender", club));
    for (let count = 0; count < 6; count += 1) players.push(person(id++, "midfielder", club));
    for (let count = 0; count < 4; count += 1) players.push(person(id++, "forward", club));
  }
  const squad = pickSquad(players);
  assert.equal(squad.length, 15);
  assert.equal(squad.filter((player) => player.position === "goalkeeper").length, 2);
  assert.equal(squad.filter((player) => player.position === "defender").length, 5);
  assert.equal(squad.filter((player) => player.position === "forward").length, 3);
  const clubs = new Map<string, number>();
  for (const player of squad) clubs.set(player.club_short, (clubs.get(player.club_short) ?? 0) + 1);
  assert.ok([...clubs.values()].every((count) => count <= 3));
});

test("an empty squad leaves a place in every line", () => {
  const eleven = startingEleven([], "4-3-3");
  assert.equal(eleven.goalkeeper, null);
  assert.equal(eleven.defenders.length, 4);
  assert.equal(eleven.midfielders.length, 3);
  assert.equal(eleven.forwards.length, 3);
  assert.ok(eleven.defenders.every((player) => player === null));
});

test("a signed forward stands on the pitch once", () => {
  const eleven = startingEleven([person(1, "forward", "PSG")], "4-3-3");
  const names = [eleven.goalkeeper, ...eleven.defenders, ...eleven.midfielders, ...eleven.forwards, ...eleven.bench];
  assert.equal(names.filter((player) => player?.id === 1).length, 1);
  assert.equal(eleven.forwards[0]?.id, 1);
});

test("a free place takes the first player of that position", () => {
  const added = signPlayer([], person(1, "forward", "PSG"), null);
  assert.equal(added?.length, 1);
  assert.equal(signPlayer([], person(1, "forward", "PSG"), 99), null);
});

test("refuses a fourth player from the same club", () => {
  const squad = [
    person(1, "forward", "LYO"),
    person(2, "forward", "PSG"),
    person(3, "midfielder", "PSG"),
    person(4, "defender", "PSG"),
  ];
  assert.equal(replacePlayer(squad, 1, person(9, "forward", "PSG")), null);
  const swapped = replacePlayer(squad, 1, person(9, "forward", "REN"));
  assert.equal(swapped?.[0].club_short, "REN");
});
