import { Router } from "express";
import { db } from "@workspace/db";
import { asistenciasTable, personasTable, pelotonesTable, procesosTable, pnfsTable } from "@workspace/db";
import { eq, and, inArray } from "drizzle-orm";
import { requireAuth, requireSuperusuario } from "../lib/auth.js";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  const user = (req as any).user;
  const pelotonId = req.query.pelotonId ? parseInt(req.query.pelotonId as string) : undefined;
  const fecha = req.query.fecha as string | undefined;
  const estado = req.query.estado as string | undefined;

  let asistencias = await db.select().from(asistenciasTable);
  let personas = await db.select().from(personasTable);

  if (user.rol !== "superusuario" && user.pelotonId) {
    asistencias = asistencias.filter((a) => a.pelotonId === user.pelotonId);
    personas = personas.filter((p) => p.pelotonId === user.pelotonId);
  } else {
    if (pelotonId) {
      asistencias = asistencias.filter((a) => a.pelotonId === pelotonId);
      personas = personas.filter((p) => p.pelotonId === pelotonId);
    }
  }
  if (fecha) asistencias = asistencias.filter((a) => a.fecha === fecha);
  if (estado) asistencias = asistencias.filter((a) => a.estado === estado);

  const personasMap = new Map(personas.map((p) => [p.id, p]));

  res.json(
    asistencias.map((a) => {
      const persona = personasMap.get(a.personaId);
      return {
        ...a,
        personaNombres: persona?.nombres ?? "",
        personaApellidos: persona?.apellidos ?? "",
        personaCi: persona?.ci ?? "",
        personaSexo: persona?.sexo ?? "",
        createdAt: a.createdAt.toISOString(),
        updatedAt: a.updatedAt.toISOString(),
      };
    })
  );
});

router.post("/", requireAuth, async (req, res) => {
  const user = (req as any).user;
  const { pelotonId, fecha, registros } = req.body;

  if (!pelotonId || !fecha || !registros) {
    res.status(400).json({ error: "Bad Request", message: "pelotonId, fecha, registros required" });
    return;
  }

  if (user.rol !== "superusuario" && user.pelotonId !== pelotonId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  for (const r of registros) {
    const [existing] = await db
      .select()
      .from(asistenciasTable)
      .where(and(eq(asistenciasTable.personaId, r.personaId), eq(asistenciasTable.fecha, fecha)))
      .limit(1);

    if (existing) {
      await db
        .update(asistenciasTable)
        .set({ estado: r.estado, motivo: r.motivo ?? null, updatedAt: new Date(), usuarioId: user.id })
        .where(and(eq(asistenciasTable.personaId, r.personaId), eq(asistenciasTable.fecha, fecha)));
    } else {
      await db.insert(asistenciasTable).values({
        personaId: r.personaId,
        pelotonId,
        fecha,
        estado: r.estado,
        motivo: r.motivo ?? null,
        usuarioId: user.id,
      });
    }
  }

  res.json({ success: true, message: "Attendance saved" });
});

router.get("/dashboard", requireAuth, async (req, res) => {
  const user = (req as any).user;
  const fecha = req.query.fecha as string;
  const procesoId = req.query.procesoId ? parseInt(req.query.procesoId as string) : undefined;
  const pnfId = req.query.pnfId ? parseInt(req.query.pnfId as string) : undefined;

  if (!fecha) {
    res.status(400).json({ error: "Bad Request", message: "fecha required" });
    return;
  }

  let pelotones = await db.select().from(pelotonesTable);
  if (user.rol !== "superusuario" && user.pelotonId) {
    pelotones = pelotones.filter((p) => p.id === user.pelotonId);
  } else {
    if (procesoId) pelotones = pelotones.filter((p) => p.procesoId === procesoId);
    if (pnfId) pelotones = pelotones.filter((p) => p.pnfId === pnfId);
  }

  const allPersonas = await db.select().from(personasTable);
  const allAsistencias = await db.select().from(asistenciasTable).then((a) => a.filter((x) => x.fecha === fecha));
  const allProcesos = await db.select().from(procesosTable);
  const allPnfs = await db.select().from(pnfsTable);

  const stats = pelotones.map((pel) => {
    const personas = allPersonas.filter((p) => p.pelotonId === pel.id);
    const proceso = allProcesos.find((p) => p.id === pel.procesoId);
    const pnf = allPnfs.find((p) => p.id === pel.pnfId);

    const asistenciaMap = new Map(
      allAsistencias.filter((a) => a.pelotonId === pel.id).map((a) => [a.personaId, a])
    );

    const counts = { presentes: 0, presentesH: 0, presentesM: 0, inasistentes: 0, inasistentesH: 0, inasistentesM: 0, comisiones: 0, comisionesH: 0, comisionesM: 0, reposos: 0, reposesH: 0, reposesM: 0 };

    for (const persona of personas) {
      const asistencia = asistenciaMap.get(persona.id);
      const estado = asistencia?.estado ?? "inasistente";
      const isH = persona.sexo === "M";
      const isM = persona.sexo === "F";

      if (estado === "presente") {
        counts.presentes++;
        if (isH) counts.presentesH++;
        if (isM) counts.presentesM++;
      } else if (estado === "inasistente") {
        counts.inasistentes++;
        if (isH) counts.inasistentesH++;
        if (isM) counts.inasistentesM++;
      } else if (estado === "comision") {
        counts.comisiones++;
        if (isH) counts.comisionesH++;
        if (isM) counts.comisionesM++;
      } else if (estado === "reposo") {
        counts.reposos++;
        if (isH) counts.reposesH++;
        if (isM) counts.reposesM++;
      }
    }

    return {
      pelotonId: pel.id,
      pelotonNombre: pel.nombre,
      pnfNombre: pnf?.nombre ?? "",
      procesoNombre: proceso?.nombre ?? "",
      total: personas.length,
      ...counts,
    };
  });

  res.json(stats);
});

router.get("/inasistentes", requireAuth, async (req, res) => {
  const user = (req as any).user;
  const fecha = req.query.fecha as string;
  const procesoId = req.query.procesoId ? parseInt(req.query.procesoId as string) : undefined;
  const pnfId = req.query.pnfId ? parseInt(req.query.pnfId as string) : undefined;
  const pelotonId = req.query.pelotonId ? parseInt(req.query.pelotonId as string) : undefined;

  if (!fecha) {
    res.status(400).json({ error: "Bad Request", message: "fecha required" });
    return;
  }

  let pelotones = await db.select().from(pelotonesTable);
  if (user.rol !== "superusuario" && user.pelotonId) {
    pelotones = pelotones.filter((p) => p.id === user.pelotonId);
  } else {
    if (pelotonId) pelotones = pelotones.filter((p) => p.id === pelotonId);
    else if (procesoId) pelotones = pelotones.filter((p) => p.procesoId === procesoId);
    if (pnfId) pelotones = pelotones.filter((p) => p.pnfId === pnfId);
  }

  const allPersonas = await db.select().from(personasTable);
  const allAsistencias = await db.select().from(asistenciasTable).then((a) => a.filter((x) => x.fecha === fecha));
  const allProcesos = await db.select().from(procesosTable);
  const allPnfs = await db.select().from(pnfsTable);

  const result: any[] = [];

  for (const pel of pelotones) {
    const personas = allPersonas.filter((p) => p.pelotonId === pel.id);
    const proceso = allProcesos.find((p) => p.id === pel.procesoId);
    const pnf = allPnfs.find((p) => p.id === pel.pnfId);
    const asistenciaMap = new Map(
      allAsistencias.filter((a) => a.pelotonId === pel.id).map((a) => [a.personaId, a])
    );

    for (const persona of personas) {
      const asistencia = asistenciaMap.get(persona.id);
      const estado = asistencia?.estado ?? "inasistente";
      if (estado === "inasistente") {
        result.push({
          personaId: persona.id,
          nombres: persona.nombres,
          apellidos: persona.apellidos,
          ci: persona.ci,
          sexo: persona.sexo,
          pelotonNombre: pel.nombre,
          pnfNombre: pnf?.nombre ?? "",
          procesoNombre: proceso?.nombre ?? "",
          estado,
          motivo: asistencia?.motivo ?? null,
        });
      }
    }
  }

  res.json(result);
});

export default router;
