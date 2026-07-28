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
  const row = rows[0] as { payload: string; updated_at: string | number; updated_by: string } | undefined;
  return Response.json({ 
    state: row ? JSON.parse(row.payload) : null, 
    user: user.name,
    version: row ? String(row.updated_at) : "0"
  });
}

export async function PUT(request: Request) {
  const user = await userFor(request);
  if (!user) return Response.json({ error: "Sesión no válida" }, { status: 401 });
  
  const body = await request.json();
  const { state, version, action, details } = body;
  
  const payload = JSON.stringify(state);
  if (payload.length > 2_000_000) return Response.json({ error: "Datos demasiado extensos" }, { status: 413 });
  
  const db = database();
  
  // Comprobación de Concurrencia (OCC)
  const rows = await db`SELECT updated_at FROM app_state WHERE id=1`;
  const currentRow = rows[0] as { updated_at: string | number } | undefined;
  const dbVersion = currentRow ? String(currentRow.updated_at) : "0";
  
  if (currentRow && version && dbVersion !== version) {
    return Response.json({ 
      error: "Conflicto de concurrencia: Otro usuario ha modificado los datos. Por favor recarga la página." 
    }, { status: 409 });
  }
  
  const now = Date.now();
  
  // Guardar estado
  await db`INSERT INTO app_state (id,payload,updated_at,updated_by) VALUES (1,${payload},${now},${user.name}) ON CONFLICT(id) DO UPDATE SET payload=EXCLUDED.payload,updated_at=EXCLUDED.updated_at,updated_by=EXCLUDED.updated_by`;
  
  // Garantizar existencia de tabla de logs y sembrar acción
  await db`CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    timestamp BIGINT NOT NULL,
    user_name TEXT NOT NULL,
    action TEXT NOT NULL,
    details TEXT NOT NULL
  )`;
  
  if (action) {
    await db`INSERT INTO audit_logs (timestamp, user_name, action, details) VALUES (${now}, ${user.name}, ${action}, ${details || ""})`;
  }
  
  return Response.json({ ok: true, updatedBy: user.name, version: String(now) });
}
