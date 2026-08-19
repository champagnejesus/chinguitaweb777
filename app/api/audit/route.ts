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
  
  const db = database();
  
  // Crear la tabla si no existe
  await db`CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    timestamp BIGINT NOT NULL,
    user_name TEXT NOT NULL,
    action TEXT NOT NULL,
    details TEXT NOT NULL
  )`;
  
  const logs = await db`SELECT timestamp, user_name, action, details FROM audit_logs ORDER BY timestamp DESC LIMIT 100`;
  
  // Mapeamos los campos para asegurarnos de convertirlos a tipos de datos nativos legibles
  const formattedLogs = logs.map(x => ({
    timestamp: Number(x.timestamp),
    userName: String(x.user_name),
    action: String(x.action),
    details: String(x.details)
  }));
  
  return Response.json({ logs: formattedLogs });
}
