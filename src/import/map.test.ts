import assert from "node:assert/strict";
import test from "node:test";
import { canonicalClubName, mapFootballStatus, mapPosition, mapStatus, matchdayFromRound, shortName } from "./map.ts";

test("maps API positions onto the four fantasy positions", () => {
  assert.equal(mapPosition("Goalkeeper"), "goalkeeper");
  assert.equal(mapPosition("Defender"), "defender");
  assert.equal(mapPosition("Midfielder"), "midfielder");
  assert.equal(mapPosition("Attacker"), "forward");
  assert.equal(mapPosition(""), null);
});

test("maps fixture status codes", () => {
  assert.equal(mapStatus("NS"), "scheduled");
  assert.equal(mapStatus("1H"), "live");
  assert.equal(mapStatus("FT"), "finished");
  assert.equal(mapStatus("PST"), "postponed");
  assert.equal(mapStatus("CANC"), "cancelled");
});

test("reads the matchday from a regular-season round label", () => {
  assert.equal(matchdayFromRound("Regular Season - 1"), 1);
  assert.equal(matchdayFromRound("Regular Season - 34"), 34);
  assert.equal(matchdayFromRound("Friendly"), null);
});

test("maps the current Ligue 1 names onto the stored clubs", () => {
  assert.equal(canonicalClubName("Paris Saint-Germain FC"), "paris saint germain");
  assert.equal(canonicalClubName("Stade Rennais FC 1901"), "rennes");
  assert.equal(canonicalClubName("ES Troyes AC"), "troyes");
  assert.equal(mapFootballStatus("TIMED"), "scheduled");
  assert.equal(mapFootballStatus("FINISHED"), "finished");
});

test("builds a three-letter club code", () => {
  assert.equal(shortName("psg", "Paris Saint Germain"), "PSG");
  assert.equal(shortName(null, "Le Havre"), "LEH");
});
