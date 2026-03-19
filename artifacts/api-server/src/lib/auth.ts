import { Request, Response, NextFunction } from "express";
import { db } from "@workspace/db";
import { usuariosTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { createHash } from "crypto";
import jwt from "jsonwebtoken";
const { sign, verify } = jwt;

const JWT_SECRET = process.env.JWT_SECRET || "asistencia-pelotones-secret-2025";

export function hashPassword(password: string): string {
  return createHash("sha256").update(password + "salt123").digest("hex");
}

export function generateToken(userId: number): string {
  return sign({ userId }, JWT_SECRET, { expiresIn: "30d" });
}

export function verifyToken(token: string): { userId: number } | null {
  try {
    return verify(token, JWT_SECRET) as { userId: number };
  } catch {
    return null;
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized", message: "No token provided" });
    return;
  }

  const token = authHeader.slice(7);
  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ error: "Unauthorized", message: "Invalid token" });
    return;
  }

  const [user] = await db
    .select()
    .from(usuariosTable)
    .where(eq(usuariosTable.id, payload.userId))
    .limit(1);

  if (!user || !user.activo) {
    res.status(401).json({ error: "Unauthorized", message: "User not found or inactive" });
    return;
  }

  (req as any).user = user;
  next();
}

export async function requireSuperusuario(req: Request, res: Response, next: NextFunction) {
  await requireAuth(req, res, () => {
    const user = (req as any).user;
    if (user?.rol !== "superusuario") {
      res.status(403).json({ error: "Forbidden", message: "Superusuario role required" });
      return;
    }
    next();
  });
}
