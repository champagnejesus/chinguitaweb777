import { neon } from "@neondatabase/serverless";

const USERS = ["Juan Pablo", "Soledad Cortes", "Miguel Angel Contreras", "Administrador"];
const DEFAULT_PASSWORD = process.env.DEFAULT_USER_PASSWORD || "Cambiar-Esta-Clave";

function database() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL no configurada");
  return neon(process.env.DATABASE_URL);
}

async function hash(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function init() {
  const db = database();
  await db`CREATE TABLE IF NOT EXISTS users (id SERIAL PRIMARY KEY, name TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL, salt TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1)`;
  await db`CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, user_id INTEGER NOT NULL, expires_at BIGINT NOT NULL)`;
  await db`CREATE TABLE IF NOT EXISTS app_state (id INTEGER PRIMARY KEY, payload TEXT NOT NULL, updated_at BIGINT NOT NULL, updated_by TEXT NOT NULL)`;
  for (const name of USERS) {
    const salt = crypto.randomUUID();
    const passwordHash = await hash(`${salt}:${DEFAULT_PASSWORD}`);
    await db`INSERT INTO users (name,password_hash,salt,active) VALUES (${name},${passwordHash},${salt},1) ON CONFLICT (name) DO NOTHING`;
  }
}

export async function POST(request: Request) {
  await init();
  const { name, password } = await request.json() as { name?: string; password?: string };
  const rows = await database()`SELECT id,name,password_hash,salt FROM users WHERE name=${name || ""} AND active=1`;
  const user = rows[0] as { id: number; name: string; password_hash: string; salt: string } | undefined;
  if (!user || await hash(`${user.salt}:${password || ""}`) !== user.password_hash) {
    return Response.json({ error: "Nombre o clave incorrectos" }, { status: 401 });
  }
  const token = `${crypto.randomUUID()}${crypto.randomUUID()}`;
  const expiresAt = Date.now() + 1000 * 60 * 60 * 24 * 30;
  await database()`INSERT INTO sessions (token,user_id,expires_at) VALUES (${token},${user.id},${expiresAt})`;
  return Response.json({ token, user: user.name });
}

export async function DELETE(request: Request) {
  const token = request.headers.get("authorization")?.replace("Bearer ", "");
  if (token) await database()`DELETE FROM sessions WHERE token=${token}`;
  return Response.json({ ok: true });
}
