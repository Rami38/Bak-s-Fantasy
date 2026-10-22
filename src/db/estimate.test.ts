import assert from "node:assert/strict";
import test from "node:test";
import { estimatePriceTenths } from "./estimate.ts";

test("stars cost more than ordinary forwards, and keepers stay cheapest", () => {
  const doue = estimatePriceTenths(225, "D. Doué", "forward");
  const kvara = estimatePriceTenths(227, "K. Kvaratskhelia", "forward");
  const dembele = estimatePriceTenths(224, "O. Dembélé", "forward");
  const barcola = estimatePriceTenths(9, "B. Barcola", "forward");
  const ordinary = estimatePriceTenths(999, "A. Someone", "forward");
  const keeper = estimatePriceTenths(12, "A. Keeper", "goalkeeper");
  const chevalier = estimatePriceTenths(4, "L. Chevalier", "goalkeeper");
  assert.ok(doue >= 130 && kvara >= 140 && dembele >= 140 && barcola >= 130);
  assert.ok(ordinary <= 72);
  assert.ok(keeper <= 49);
  assert.equal(chevalier, 62);
  assert.ok(keeper < ordinary);
  assert.ok(ordinary < doue);
});
