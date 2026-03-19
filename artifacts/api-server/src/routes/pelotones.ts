import { Router } from "express";
import { db } from "@workspace/db";
import { pelotonesTable, procesosTable, pnfsTable, personasTable } from "@workspace/db";
import { eq, count, and } from "drizzle-orm";
import { requireAuth, requireSuperusuario } from "../lib/auth.js";

const router = Router();

async function buildPelotonResponse(peloton: typeof pelotonesTable.$inferSelect) {
  const [proceso] = await db.select({ nombre: procesosTable.nombre }).from(procesosTable).where(eq(procesosTable.id, peloton.procesoId)).limit(1);
  const [pnf] = await db.select({ nombre: pnfsTable.nombre }).from(pnfsTable).where(eq(pnfsTable.id, peloton.pnfId)).limit(1);
  const [{ value: total }] = await db.select({ value: count() }).from(personasTable).where(eq(personasTable.pelotonId, peloton.id));
  return {
    ...peloton,
    procesoNombre: proceso?.nombre ?? "",
    pnfNombre: pnf?.nombre ?? "",
    totalPersonas: Number(total),
    createdAt: peloton.createdAt.toISOString(),
  };
}

router.get("/", requireAuth, async (req, res) => {
  const user = (req as any).user;
  const procesoId = req.query.procesoId ? parseInt(req.query.procesoId as string) : undefined;
  const pnfId = req.query.pnfId ? parseInt(req.query.pnfId as string) : undefined;

  let rows = await db.select().from(pelotonesTable);

  if (user.rol !== "superusuario" && user.pelotonId) {
    rows = rows.filter((p) => p.id === user.pelotonId);
  } else {
    if (procesoId) rows = rows.filter((p) => p.procesoId === procesoId);
    if (pnfId) rows = rows.filter((p) => p.pnfId === pnfId);
  }

  const result = await Promise.all(rows.map(buildPelotonResponse));
  res.json(result);
});

router.post("/", requireSuperusuario, async (req, res) => {
  const { nombre, procesoId, pnfId } = req.body;
  if (!nombre || !procesoId || !pnfId) {
    res.status(400).json({ error: "Bad Request", message: "nombre, procesoId, pnfId required" });
    return;
  }
  const [created] = await db.insert(pelotonesTable).values({ nombre, procesoId, pnfId }).returning();
  res.status(201).json(await buildPelotonResponse(created));
});

router.put("/:id", requireSuperusuario, async (req, res) => {
  const id = parseInt(req.params.id);
  const { nombre, procesoId, pnfId } = req.body;
  const updates: Record<string, any> = {};
  if (nombre !== undefined) updates.nombre = nombre;
  if (procesoId !== undefined) updates.procesoId = procesoId;
  if (pnfId !== undefined) updates.pnfId = pnfId;
  const [updated] = await db.update(pelotonesTable).set(updates).where(eq(pelotonesTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "Not Found" }); return; }
  res.json(await buildPelotonResponse(updated));
});

router.delete("/:id", requireSuperusuario, async (req, res) => {
  const id = parseInt(req.params.id);
  await db.delete(pelotonesTable).where(eq(pelotonesTable.id, id));
  res.json({ success: true, message: "Squad deleted" });
});

export default router;
