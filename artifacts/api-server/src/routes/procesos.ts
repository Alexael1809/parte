import { Router } from "express";
import { db } from "@workspace/db";
import { procesosTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, requireSuperusuario } from "../lib/auth.js";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  const includeArchived = req.query.includeArchived === "true";
  const rows = await db.select().from(procesosTable);
  const filtered = includeArchived ? rows : rows.filter((p) => p.activo);
  res.json(
    filtered.map((p) => ({
      ...p,
      fechaArchivado: p.fechaArchivado?.toISOString() ?? null,
      createdAt: p.createdAt.toISOString(),
    }))
  );
});

router.post("/", requireSuperusuario, async (req, res) => {
  const { nombre } = req.body;
  if (!nombre) {
    res.status(400).json({ error: "Bad Request", message: "nombre required" });
    return;
  }
  const [created] = await db
    .insert(procesosTable)
    .values({ nombre })
    .returning();
  res.status(201).json({
    ...created,
    fechaArchivado: created.fechaArchivado?.toISOString() ?? null,
    createdAt: created.createdAt.toISOString(),
  });
});

router.put("/:id", requireSuperusuario, async (req, res) => {
  const id = parseInt(req.params.id);
  const { nombre, activo } = req.body;
  const updates: Record<string, any> = {};
  if (nombre !== undefined) updates.nombre = nombre;
  if (activo !== undefined) {
    updates.activo = activo;
    if (!activo) updates.fechaArchivado = new Date();
  }
  const [updated] = await db
    .update(procesosTable)
    .set(updates)
    .where(eq(procesosTable.id, id))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Not Found" });
    return;
  }
  res.json({
    ...updated,
    fechaArchivado: updated.fechaArchivado?.toISOString() ?? null,
    createdAt: updated.createdAt.toISOString(),
  });
});

router.delete("/:id", requireSuperusuario, async (req, res) => {
  const id = parseInt(req.params.id);
  await db
    .update(procesosTable)
    .set({ activo: false, fechaArchivado: new Date() })
    .where(eq(procesosTable.id, id));
  res.json({ success: true, message: "Process archived" });
});

export default router;
