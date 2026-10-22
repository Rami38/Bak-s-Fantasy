import { pool } from "../db/pool.ts";
import { hashPassword, verifyPassword } from "./password.ts";
import { hashToken, newToken } from "./session.ts";

export type Manager = {
  name: string;
  username: string | null;
  email: string | null;
  isCommissioner: boolean;
};

type Failure = { error: string; status: number };
type Success = { manager: Manager; token: string };
type UserRow = { id: number; name: string; username: string | null; email: string | null; is_commissioner: boolean };

function present(row: UserRow): Manager {
  return {
    name: row.username ?? row.name,
    username: row.username,
    email: row.email,
    isCommissioner: row.is_commissioner,
  };
}

function parseUsername(value: string): { username: string } | Failure {
  const username = value.trim().replace(/\s+/g, " ");
  if (!/^[\p{L}\p{N}][\p{L}\p{N} .'_-]{1,19}$/u.test(username) || username.includes("@")) {
    return { error: "Choose a username of 2 to 20 letters or numbers.", status: 400 };
  }
  return { username };
}

function validEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function validatePassword(password: string): Failure | null {
  if (password.length < 8) return { error: "Use a password of at least 8 characters.", status: 400 };
  return null;
}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "23505";
}

async function openSession(userId: number): Promise<string> {
  const token = newToken();
  await pool.query(
    `INSERT INTO session (user_id, token_hash, expires_at) VALUES ($1, $2, now() + interval '30 days')`,
    [userId, hashToken(token)],
  );
  return token;
}

async function taken(value: string, exceptId?: number): Promise<boolean> {
  const result = await pool.query<{ id: number }>(
    `SELECT id FROM app_user
     WHERE ($2::int IS NULL OR id <> $2)
       AND (lower(name) = lower($1) OR lower(username) = lower($1) OR lower(email) = lower($1))
     LIMIT 1`,
    [value, exceptId ?? null],
  );
  return result.rows.length > 0;
}

export async function signUp(username: string, email: string, password: string): Promise<Success | Failure> {
  const parsed = parseUsername(username);
  if ("error" in parsed) return parsed;
  const address = email.trim().toLowerCase();
  if (!validEmail(address)) return { error: "Enter a real email address.", status: 400 };
  const passwordError = validatePassword(password);
  if (passwordError) return passwordError;
  if (await taken(parsed.username) || await taken(address)) {
    return { error: "That username or email is already taken.", status: 409 };
  }
  const passwordHash = await hashPassword(password);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("LOCK TABLE app_user IN EXCLUSIVE MODE");
    const count = await client.query<{ n: number }>("SELECT COUNT(*)::int AS n FROM app_user");
    const user = await client.query<UserRow>(
      `INSERT INTO app_user (name, username, email, password_hash, is_commissioner)
       VALUES ($1, $1, $2, $3, $4)
       RETURNING id, name, username, email, is_commissioner`,
      [parsed.username, address, passwordHash, count.rows[0].n === 0],
    );
    const token = newToken();
    await client.query(
      `INSERT INTO session (user_id, token_hash, expires_at) VALUES ($1, $2, now() + interval '30 days')`,
      [user.rows[0].id, hashToken(token)],
    );
    await client.query("COMMIT");
    return { manager: present(user.rows[0]), token };
  } catch (error) {
    await client.query("ROLLBACK");
    if (isUniqueViolation(error)) return { error: "That username or email is already taken.", status: 409 };
    throw error;
  } finally {
    client.release();
  }
}

export async function signIn(identifier: string, password: string): Promise<Success | Failure> {
  const value = identifier.trim();
  if (value.length < 2) return { error: "Enter your username or email.", status: 400 };
  const passwordError = validatePassword(password);
  if (passwordError) return passwordError;
  const user = await pool.query<UserRow & { password_hash: string }>(
    `SELECT id, name, username, email, password_hash, is_commissioner
     FROM app_user
     WHERE lower(name) = lower($1) OR lower(username) = lower($1) OR lower(email) = lower($1)`,
    [value],
  );
  const row = user.rows[0];
  if (!row || !(await verifyPassword(password, row.password_hash))) {
    return { error: "That username and password do not match.", status: 401 };
  }
  const token = await openSession(row.id);
  return { manager: present(row), token };
}

export async function setUsername(userId: number, username: string): Promise<{ manager: Manager } | Failure> {
  const parsed = parseUsername(username);
  if ("error" in parsed) return parsed;
  if (await taken(parsed.username, userId)) return { error: "That username is already taken.", status: 409 };
  const updated = await pool.query<UserRow>(
    `UPDATE app_user SET username = $2 WHERE id = $1 RETURNING id, name, username, email, is_commissioner`,
    [userId, parsed.username],
  );
  if (!updated.rows[0]) return { error: "Sign in first.", status: 401 };
  return { manager: present(updated.rows[0]) };
}

export async function signOut(token: string | null): Promise<void> {
  if (!token) return;
  await pool.query("DELETE FROM session WHERE token_hash = $1", [hashToken(token)]);
}

export async function managerFromToken(token: string | null): Promise<Manager | null> {
  if (!token) return null;
  const result = await pool.query<UserRow>(
    `SELECT u.id, u.name, u.username, u.email, u.is_commissioner
     FROM session s
     JOIN app_user u ON u.id = s.user_id
     WHERE s.token_hash = $1 AND s.expires_at > now()`,
    [hashToken(token)],
  );
  const row = result.rows[0];
  if (!row) return null;
  return present(row);
}
