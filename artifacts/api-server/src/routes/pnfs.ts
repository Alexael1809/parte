import { Router } from "express";
import { db } from "@workspace/db";
import { pnfsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, requireSuperusuario } from "../lib/auth.js";

const router = Router();

router.get("/", requireAuth, async (_req, res) => {
  const rows = await db.select().from(pnfsTable);
  res.json(rows.map((p) => ({ ...p, createdAt: p.createdAt.toISOString() })));
});

router.post("/", requireSuperusuario, async (req, res) => {
  const { nombre } = req.body;
  if (!nombre) {
    res.status(400).json({ error: "Bad Request", message: "nombre required" });
    return;
  }
  const [created] = await db.insert(pnfsTable).values({ nombre }).returning();
  res.status(201).json({ ...created, createdAt: created.createdAt.toISOString() });
});

router.put("/:id", requireSuperusuario, async (req, res) => {
  const id = parseInt(req.params.id);
  const { nombre } = req.body;
  const [updated] = await db
    .update(pnfsTable)
    .set({ nombre })
    .where(eq(pnfsTable.id, id))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Not Found" });
    return;
  }
  res.json({ ...updated, createdAt: updated.createdAt.toISOString() });
});

router.delete("/:id", requireSuperusuario, async (req, res) => {
  const id = parseInt(req.params.id);
  const [deleted] = await db
    .delete(pnfsTable)
    .where(eq(pnfsTable.id, id))
    .returning();
  if (!deleted) {
    res.status(404).json({ error: "Not Found" });
    return;
  }
  res.json({ success: true, message: "PNF deleted" });
});

export default router;
