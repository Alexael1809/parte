import { Router } from "express";
import { db } from "@workspace/db";
import { usuariosTable, pelotonesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireSuperusuario } from "../lib/auth.js";
import { hashPassword } from "../lib/auth.js";

const router = Router();

async function buildUsuarioResponse(user: typeof usuariosTable.$inferSelect) {
  let pelotonNombre: string | null = null;
  if (user.pelotonId) {
    const [peloton] = await db.select({ nombre: pelotonesTable.nombre }).from(pelotonesTable).where(eq(pelotonesTable.id, user.pelotonId)).limit(1);
    pelotonNombre = peloton?.nombre ?? null;
  }
  return {
    id: user.id,
    email: user.email,
    nombre: user.nombre,
    rol: user.rol,
    pelotonId: user.pelotonId,
    pelotonNombre,
    activo: user.activo,
    createdAt: user.createdAt.toISOString(),
  };
}

router.get("/", requireSuperusuario, async (_req, res) => {
  const rows = await db.select().from(usuariosTable);
  const result = await Promise.all(rows.map(buildUsuarioResponse));
  res.json(result);
});

router.post("/", requireSuperusuario, async (req, res) => {
  const { email, nombre, password, rol, pelotonId } = req.body;
  if (!email || !nombre || !password || !rol) {
    res.status(400).json({ error: "Bad Request", message: "email, nombre, password, rol required" });
    return;
  }
  const passwordHash = hashPassword(password);
  const [created] = await db.insert(usuariosTable).values({ email: email.toLowerCase(), nombre, passwordHash, rol, pelotonId: pelotonId ?? null }).returning();
  res.status(201).json(await buildUsuarioResponse(created));
});

router.put("/:id", requireSuperusuario, async (req, res) => {
  const id = parseInt(req.params.id);
  const { email, nombre, password, rol, pelotonId, activo } = req.body;
  const updates: Record<string, any> = {};
  if (email !== undefined) updates.email = email.toLowerCase();
  if (nombre !== undefined) updates.nombre = nombre;
  if (password !== undefined) updates.passwordHash = hashPassword(password);
  if (rol !== undefined) updates.rol = rol;
  if (pelotonId !== undefined) updates.pelotonId = pelotonId;
  if (activo !== undefined) updates.activo = activo;
  const [updated] = await db.update(usuariosTable).set(updates).where(eq(usuariosTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "Not Found" }); return; }
  res.json(await buildUsuarioResponse(updated));
});

router.delete("/:id", requireSuperusuario, async (req, res) => {
  const id = parseInt(req.params.id);
  await db.delete(usuariosTable).where(eq(usuariosTable.id, id));
  res.json({ success: true, message: "User deleted" });
});

export default router;
