import { Router } from "express";
import { db } from "@workspace/db";
import { personasTable, pelotonesTable, planesBusquedaTable } from "@workspace/db";
import { eq, ilike, or, and } from "drizzle-orm";
import { requireAuth, requireSuperusuario } from "../lib/auth.js";

const router = Router();

async function buildPersonaResponse(persona: typeof personasTable.$inferSelect) {
  const [peloton] = await db.select({ nombre: pelotonesTable.nombre }).from(pelotonesTable).where(eq(pelotonesTable.id, persona.pelotonId)).limit(1);
  return {
    ...persona,
    pelotonNombre: peloton?.nombre ?? "",
    createdAt: persona.createdAt.toISOString(),
    updatedAt: persona.updatedAt.toISOString(),
  };
}

router.get("/", requireAuth, async (req, res) => {
  const user = (req as any).user;
  const pelotonId = req.query.pelotonId ? parseInt(req.query.pelotonId as string) : undefined;
  const search = req.query.search as string | undefined;

  let rows = await db.select().from(personasTable);

  if (user.rol !== "superusuario" && user.pelotonId) {
    rows = rows.filter((p) => p.pelotonId === user.pelotonId);
  } else if (pelotonId) {
    rows = rows.filter((p) => p.pelotonId === pelotonId);
  }

  if (search) {
    const s = search.toLowerCase();
    rows = rows.filter(
      (p) =>
        p.nombres.toLowerCase().includes(s) ||
        p.apellidos.toLowerCase().includes(s) ||
        p.ci.includes(s)
    );
  }

  const result = await Promise.all(rows.map(buildPersonaResponse));
  res.json(result);
});

router.post("/", requireSuperusuario, async (req, res) => {
  const { nombres, apellidos, ci, sexo, pelotonId } = req.body;
  if (!nombres || !apellidos || !ci || !sexo || !pelotonId) {
    res.status(400).json({ error: "Bad Request", message: "All fields required" });
    return;
  }
  const [created] = await db.insert(personasTable).values({ nombres, apellidos, ci, sexo, pelotonId }).returning();
  await db.insert(planesBusquedaTable).values({ personaId: created.id }).onConflictDoNothing();
  res.status(201).json(await buildPersonaResponse(created));
});

router.get("/:id", requireAuth, async (req, res) => {
  const id = parseInt(req.params.id);
  const [persona] = await db.select().from(personasTable).where(eq(personasTable.id, id)).limit(1);
  if (!persona) { res.status(404).json({ error: "Not Found" }); return; }
  res.json(await buildPersonaResponse(persona));
});

router.put("/:id", requireSuperusuario, async (req, res) => {
  const id = parseInt(req.params.id);
  const { nombres, apellidos, ci, sexo, pelotonId } = req.body;
  const updates: Record<string, any> = { updatedAt: new Date() };
  if (nombres !== undefined) updates.nombres = nombres;
  if (apellidos !== undefined) updates.apellidos = apellidos;
  if (ci !== undefined) updates.ci = ci;
  if (sexo !== undefined) updates.sexo = sexo;
  if (pelotonId !== undefined) updates.pelotonId = pelotonId;
  const [updated] = await db.update(personasTable).set(updates).where(eq(personasTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "Not Found" }); return; }
  res.json(await buildPersonaResponse(updated));
});

router.delete("/:id", requireSuperusuario, async (req, res) => {
  const id = parseInt(req.params.id);
  await db.delete(planesBusquedaTable).where(eq(planesBusquedaTable.personaId, id));
  await db.delete(personasTable).where(eq(personasTable.id, id));
  res.json({ success: true, message: "Person deleted" });
});

router.get("/:id/plan-busqueda", requireAuth, async (req, res) => {
  const id = parseInt(req.params.id);
  const [plan] = await db.select().from(planesBusquedaTable).where(eq(planesBusquedaTable.personaId, id)).limit(1);
  if (!plan) {
    const [newPlan] = await db.insert(planesBusquedaTable).values({ personaId: id }).returning();
    res.json(newPlan);
    return;
  }
  res.json(plan);
});

router.put("/:id/plan-busqueda", requireAuth, async (req, res) => {
  const id = parseInt(req.params.id);
  const { telefono1, telefono2, telefono3, direccion, lugarOrigen } = req.body;

  const [existing] = await db.select().from(planesBusquedaTable).where(eq(planesBusquedaTable.personaId, id)).limit(1);
  const updates = { telefono1, telefono2, telefono3, direccion, lugarOrigen };

  if (existing) {
    const [updated] = await db.update(planesBusquedaTable).set(updates).where(eq(planesBusquedaTable.personaId, id)).returning();
    res.json(updated);
  } else {
    const [created] = await db.insert(planesBusquedaTable).values({ personaId: id, ...updates }).returning();
    res.json(created);
  }
});

export default router;
