import { Router } from "express";
import { db } from "@workspace/db";
import { personasTable, pelotonesTable, planesBusquedaTable, pnfsTable, procesosTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, requireSuperusuario, allowInvisibleUser } from "../lib/auth.js";

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

router.post("/importar", requireSuperusuario, async (req, res) => {
  const { filas } = req.body;
  if (!Array.isArray(filas) || filas.length === 0) {
    res.status(400).json({ error: "Bad Request", message: "No hay filas para importar" });
    return;
  }

  const [allPnfs, allProcesos, allPelotones, allPersonas] = await Promise.all([
    db.select().from(pnfsTable),
    db.select().from(procesosTable),
    db.select().from(pelotonesTable),
    db.select({ ci: personasTable.ci }).from(personasTable),
  ]);

  const existingCIs = new Set(allPersonas.map((p) => p.ci));
  const seenInBatch = new Set<string>();

  type Resultado = { fila: number; cedula: string; estado: "ok" | "error"; mensaje: string };
  const resultados: Resultado[] = [];
  const toInsert: { nombres: string; apellidos: string; ci: string; sexo: string; pelotonId: number }[] = [];
  const toInsertMeta: { fila: number; cedula: string; pelotonNombre: string }[] = [];

  for (let i = 0; i < filas.length; i++) {
    const raw = filas[i];
    const numFila = i + 2;

    const cedula     = String(raw.cedula    ?? "").trim();
    const nombres    = String(raw.nombres   ?? "").trim();
    const apellidos  = String(raw.apellidos ?? "").trim();
    const genero     = String(raw.genero    ?? "").trim().toUpperCase();
    const pnfNombre  = String(raw.pnf       ?? "").trim();
    const procNombre = String(raw.proceso   ?? "").trim();

    if (!cedula && !nombres && !apellidos && !pnfNombre && !procNombre) {
      resultados.push({ fila: numFila, cedula: "", estado: "error", mensaje: "Fila vacía, ignorada" });
      continue;
    }

    const errs: string[] = [];
    if (!cedula)                                  errs.push("Cédula vacía");
    if (!nombres)                                 errs.push("Nombres vacíos");
    if (!apellidos)                               errs.push("Apellidos vacíos");
    if (!genero)                                  errs.push("Género vacío");
    else if (!["M", "F"].includes(genero))        errs.push(`Género inválido "${raw.genero}" — debe ser M o F`);
    if (!pnfNombre)                               errs.push("PNF vacío");
    if (!procNombre)                              errs.push("Proceso vacío");

    if (errs.length > 0) {
      resultados.push({ fila: numFila, cedula, estado: "error", mensaje: errs.join(" · ") });
      continue;
    }

    if (seenInBatch.has(cedula)) {
      const primerFila = toInsertMeta.find((m) => m.cedula === cedula)?.fila ?? "?";
      resultados.push({ fila: numFila, cedula, estado: "error", mensaje: `Cédula duplicada en el archivo (fila ${primerFila})` });
      continue;
    }

    if (existingCIs.has(cedula)) {
      resultados.push({ fila: numFila, cedula, estado: "error", mensaje: `Cédula ${cedula} ya existe en la base de datos` });
      continue;
    }

    const pnf = allPnfs.find((p) => p.nombre.toLowerCase() === pnfNombre.toLowerCase());
    if (!pnf) {
      resultados.push({ fila: numFila, cedula, estado: "error", mensaje: `PNF "${pnfNombre}" no encontrado en el sistema` });
      continue;
    }

    const proceso = allProcesos.find((p) => p.nombre.toLowerCase() === procNombre.toLowerCase());
    if (!proceso) {
      resultados.push({ fila: numFila, cedula, estado: "error", mensaje: `Proceso "${procNombre}" no encontrado en el sistema` });
      continue;
    }

    const pelotonesMatch = allPelotones.filter((p) => p.pnfId === pnf.id && p.procesoId === proceso.id);
    if (pelotonesMatch.length === 0) {
      resultados.push({ fila: numFila, cedula, estado: "error", mensaje: `No existe ningún pelotón para PNF "${pnfNombre}" y Proceso "${procNombre}"` });
      continue;
    }

    const peloton = pelotonesMatch[0];
    seenInBatch.add(cedula);
    toInsert.push({ nombres, apellidos, ci: cedula, sexo: genero, pelotonId: peloton.id });
    toInsertMeta.push({ fila: numFila, cedula, pelotonNombre: peloton.nombre });
    resultados.push({ fila: numFila, cedula, estado: "ok", mensaje: `Asignado a ${peloton.nombre}` });
  }

  if (toInsert.length > 0) {
    const inserted = await db.insert(personasTable).values(toInsert).returning();
    await Promise.all(
      inserted.map((p) => db.insert(planesBusquedaTable).values({ personaId: p.id }).onConflictDoNothing())
    );
  }

  res.json({
    total: filas.length,
    importados: toInsert.length,
    errores: resultados.filter((r) => r.estado === "error").length,
    resultados,
  });
});

router.delete("/:id", allowInvisibleUser, async (req, res) => {
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
