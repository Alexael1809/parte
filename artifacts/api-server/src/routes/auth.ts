import { Router } from "express";
import { db } from "@workspace/db";
import { usuariosTable, pelotonesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { hashPassword, generateToken, requireAuth } from "../lib/auth.js";

const router = Router();

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: "Bad Request", message: "Email and password required" });
    return;
  }

  const [user] = await db
    .select()
    .from(usuariosTable)
    .where(eq(usuariosTable.email, email.toLowerCase()))
    .limit(1);

  if (!user || !user.activo) {
    res.status(401).json({ error: "Unauthorized", message: "Invalid credentials" });
    return;
  }

  const hash = hashPassword(password);
  if (hash !== user.passwordHash) {
    res.status(401).json({ error: "Unauthorized", message: "Invalid credentials" });
    return;
  }

  let pelotonNombre: string | null = null;
  if (user.pelotonId) {
    const [peloton] = await db
      .select({ nombre: pelotonesTable.nombre })
      .from(pelotonesTable)
      .where(eq(pelotonesTable.id, user.pelotonId))
      .limit(1);
    pelotonNombre = peloton?.nombre ?? null;
  }

  const token = generateToken(user.id);
  res.json({
    token,
    usuario: {
      id: user.id,
      email: user.email,
      nombre: user.nombre,
      rol: user.rol,
      pelotonId: user.pelotonId,
      pelotonNombre,
      activo: user.activo,
      isInvisible: user.isInvisible,
      createdAt: user.createdAt.toISOString(),
    },
  });
});

router.get("/me", requireAuth, async (req, res) => {
  const user = (req as any).user;
  let pelotonNombre: string | null = null;
  if (user.pelotonId) {
    const [peloton] = await db
      .select({ nombre: pelotonesTable.nombre })
      .from(pelotonesTable)
      .where(eq(pelotonesTable.id, user.pelotonId))
      .limit(1);
    pelotonNombre = peloton?.nombre ?? null;
  }

  res.json({
    id: user.id,
    email: user.email,
    nombre: user.nombre,
    rol: user.rol,
    pelotonId: user.pelotonId,
    pelotonNombre,
    activo: user.activo,
    isInvisible: user.isInvisible,
    createdAt: user.createdAt.toISOString(),
  });
});

export default router;
