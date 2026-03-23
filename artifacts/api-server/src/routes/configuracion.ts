import { Router } from "express";
import { db } from "@workspace/db";
import { configuracionTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, requireSuperusuario } from "../lib/auth.js";

const router = Router();

const CLAVE_BLOQUEO = "bloqueo_activo";

export async function getBloqueado(): Promise<boolean> {
  const [row] = await db
    .select()
    .from(configuracionTable)
    .where(eq(configuracionTable.clave, CLAVE_BLOQUEO))
    .limit(1);
  return row?.valor === "true";
}

// Cualquier usuario autenticado puede leer el estado del bloqueo
router.get("/bloqueo", requireAuth, async (_req, res) => {
  const bloqueado = await getBloqueado();
  res.json({ bloqueado });
});

// Solo superusuario puede cambiar el estado del bloqueo
router.put("/bloqueo", requireSuperusuario, async (req, res) => {
  const { bloqueado } = req.body;

  if (typeof bloqueado !== "boolean") {
    res.status(400).json({ error: "Bad Request", message: "bloqueado debe ser boolean" });
    return;
  }

  await db
    .insert(configuracionTable)
    .values({ clave: CLAVE_BLOQUEO, valor: String(bloqueado), updatedAt: new Date() })
    .onConflictDoUpdate({
      target: configuracionTable.clave,
      set: { valor: String(bloqueado), updatedAt: new Date() },
    });

  res.json({ bloqueado });
});

export default router;
