import { neon } from "@neondatabase/serverless";

function database() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL no configurada");
  return neon(process.env.DATABASE_URL);
}

async function userFor(request: Request) {
  const token = request.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return null;
  const rows = await database()`SELECT users.name FROM sessions JOIN users ON users.id=sessions.user_id WHERE sessions.token=${token} AND sessions.expires_at>${Date.now()}`;
  return rows[0] as { name: string } | undefined;
}

export async function GET(request: Request) {
  const user = await userFor(request);
  if (!user) return Response.json({ error: "Sesión no válida" }, { status: 401 });
  const rows = await database()`SELECT payload,updated_at,updated_by FROM app_state WHERE id=1`;
  const row = rows[0] as { payload: string; updated_at: number; updated_by: string } | undefined;
  return Response.json({ state: row ? JSON.parse(row.payload) : null, user: user.name });
}

export async function PUT(request: Request) {
  const user = await userFor(request);
  if (!user) return Response.json({ error: "Sesión no válida" }, { status: 401 });
  const state = await request.json();
  const payload = JSON.stringify(state);
  if (payload.length > 2_000_000) return Response.json({ error: "Datos demasiado extensos" }, { status: 413 });
  await database()`INSERT INTO app_state (id,payload,updated_at,updated_by) VALUES (1,${payload},${Date.now()},${user.name}) ON CONFLICT(id) DO UPDATE SET payload=EXCLUDED.payload,updated_at=EXCLUDED.updated_at,updated_by=EXCLUDED.updated_by`;
  return Response.json({ ok: true, updatedBy: user.name });
}
