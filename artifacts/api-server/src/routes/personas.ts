import { Router } from "express";
import { db } from "@workspace/db";
import { personasTable, pelotonesTable, planesBusquedaTable, pnfsTable, procesosTable } from "@workspace/db";
import { eq, inArray } from "drizzle-orm";
import { requireAuth, requireSuperusuario, allowInvisibleUser } from "../lib/auth.js";

const router = Router();

// Normaliza texto: minúsculas + sin tildes + sin separadores para comparación flexible
function norm(s: string): string {
  return s.toLowerCase().trim()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

// Normaliza separadores: - _ / \ . todos se convierten en espacio
function normSep(s: string): string {
  return norm(s).replace(/[-_\/\\\.]+/g, " ").replace(/\s+/g, " ").trim();
}

// Convierte números romanos a arábigos (para el nombre del proceso)
function deRoman(s: string): string {
  return s
    .replace(/\bviii\b/g, "8").replace(/\bvii\b/g, "7").replace(/\bvi\b/g, "6")
    .replace(/\biv\b/g, "4").replace(/\biii\b/g, "3").replace(/\bii\b/g, "2")
    .replace(/\bviii\b/g, "8").replace(/\bi\b/g, "1").replace(/\bv\b/g, "5");
}

// Matching flexible de proceso: prueba múltiples estrategias
function matchProceso(dbNombre: string, searchNombre: string): boolean {
  const dbN = normSep(dbNombre);
  const srN = normSep(searchNombre);

  if (dbN === srN) return true;

  const dbS = dbN.replace(/^proceso /, "").trim();
  const srS = srN.replace(/^proceso /, "").trim();

  if (dbS === srS) return true;
  if (dbS === srN || dbN === srS) return true;

  // Numeros romanos vs arábigos (I-2025 == 1-2025, II-2025 == 2-2025)
  if (deRoman(dbS) === deRoman(srS)) return true;

  // Coincidencia por contenido: si el término de búsqueda está dentro del nombre DB o viceversa
  if (srS.length >= 3 && (dbN.includes(srS) || dbS.includes(srS))) return true;
  if (dbS.length >= 3 && (srN.includes(dbS) || srS.includes(dbS))) return true;

  return false;
}

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

router.post("/bulk-delete", allowInvisibleUser, async (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    res.status(400).json({ error: "Bad Request", message: "ids array required" });
    return;
  }
  const numIds = ids.map(Number).filter(Boolean);
  await db.delete(planesBusquedaTable).where(inArray(planesBusquedaTable.personaId, numIds));
  await db.delete(personasTable).where(inArray(personasTable.id, numIds));
  res.json({ success: true, deleted: numIds.length });
});

router.post("/bulk-move", allowInvisibleUser, async (req, res) => {
  const { ids, pelotonId } = req.body;
  if (!Array.isArray(ids) || ids.length === 0 || !pelotonId) {
    res.status(400).json({ error: "Bad Request", message: "ids array and pelotonId required" });
    return;
  }
  const numIds = ids.map(Number).filter(Boolean);
  await db.update(personasTable)
    .set({ pelotonId: Number(pelotonId), updatedAt: new Date() })
    .where(inArray(personasTable.id, numIds));
  res.json({ success: true, moved: numIds.length });
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
    // Normalizar género: aceptar M/F o MASCULINO/FEMENINO
    const generoRaw  = String(raw.genero    ?? "").trim().toUpperCase();
    const generoMap: Record<string, string> = { M: "M", F: "F", MASCULINO: "M", FEMENINO: "F", MALE: "M", FEMALE: "F", MASC: "M", FEM: "F" };
    const genero     = generoMap[generoRaw] ?? generoRaw;
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

    // PNF: comparación sin tildes ni mayúsculas (INVESTIGACION PENAL == INVESTIGACIÓN PENAL)
    const pnf = allPnfs.find((p) => norm(p.nombre) === norm(pnfNombre));
    if (!pnf) {
      resultados.push({ fila: numFila, cedula, estado: "error", mensaje: `PNF "${pnfNombre}" no encontrado. Válidos: ${allPnfs.map((p) => p.nombre).join(", ")}` });
      continue;
    }

    // Proceso: matching ultra-flexible (tildes, separadores, romanos/arábigos, contenido parcial)
    // Si no hay coincidencia, se auto-crea el proceso con ese nombre (igual que los pelotones)
    let proceso = allProcesos.find((p) => matchProceso(p.nombre, procNombre));
    if (!proceso) {
      // Auto-crear proceso con el nombre tal como viene en el Excel
      const [created] = await db.insert(procesosTable).values({ nombre: procNombre.trim() }).returning();
      allProcesos.push(created);
      proceso = created;
    }

    // Pelotón: buscar existente o auto-crear uno para esta combinación PNF+Proceso
    let pelotonesMatch = allPelotones.filter((p) => p.pnfId === pnf.id && p.procesoId === proceso.id);
    let peloton: typeof allPelotones[number];
    if (pelotonesMatch.length === 0) {
      const [created] = await db.insert(pelotonesTable).values({
        nombre: "Pelotón 1",
        pnfId: pnf.id,
        procesoId: proceso.id,
      }).returning();
      allPelotones.push(created);
      peloton = created;
    } else {
      peloton = pelotonesMatch[0];
    }

    seenInBatch.add(cedula);
    toInsert.push({ nombres, apellidos, ci: cedula, sexo: genero, pelotonId: peloton.id });
    toInsertMeta.push({ fila: numFila, cedula, pelotonNombre: peloton.nombre });
    resultados.push({ fila: numFila, cedula, estado: "ok", mensaje: `Asignado a ${peloton.nombre} (${pnf.nombre} · ${proceso.nombre})` });
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
