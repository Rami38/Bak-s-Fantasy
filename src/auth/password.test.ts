import assert from "node:assert/strict";
import test from "node:test";
import { hashPassword, verifyPassword } from "./password.ts";
import { readSessionToken } from "./session.ts";

test("a password matches only its own hash", async () => {
  const stored = await hashPassword("correct-horse");
  assert.equal(await verifyPassword("correct-horse", stored), true);
  assert.equal(await verifyPassword("other-horse", stored), false);
});

test("reads the session cookie and ignores the others", () => {
  assert.equal(readSessionToken("theme=dark; session=abc123"), "abc123");
  assert.equal(readSessionToken(undefined), null);
});
