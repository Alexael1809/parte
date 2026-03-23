import { Router } from "express";
import { db } from "@workspace/db";
import { asistenciasTable, personasTable, pelotonesTable, procesosTable, pnfsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth } from "../lib/auth.js";

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

router.delete("/:id", requireAuth, async (req, res) => {
  const user = (req as any).user;
  const id = parseInt(req.params.id);

  const [asistencia] = await db.select().from(asistenciasTable).where(eq(asistenciasTable.id, id)).limit(1);

  if (!asistencia) {
    res.status(404).json({ error: "Not Found" });
    return;
  }

  if (user.rol !== "superusuario" && user.pelotonId !== asistencia.pelotonId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  await db.delete(asistenciasTable).where(eq(asistenciasTable.id, id));
  res.json({ success: true, message: "Attendance record deleted" });
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

    const counts = {
      presentes: 0, presentesH: 0, presentesM: 0,
      ausentes: 0, ausentesH: 0, ausentesM: 0,
      comisiones: 0, comisionesH: 0, comisionesM: 0,
      reposos: 0, reposesH: 0, reposesM: 0,
      pasantias: 0, pasantiasH: 0, pasantiasM: 0,
      permisos: 0, permisosH: 0, permisosM: 0,
    };

    for (const persona of personas) {
      const asistencia = asistenciaMap.get(persona.id);
      const estado = asistencia?.estado ?? "ausente";
      const isH = persona.sexo === "M";
      const isM = persona.sexo === "F";

      if (estado === "presente") {
        counts.presentes++;
        if (isH) counts.presentesH++;
        if (isM) counts.presentesM++;
      } else if (estado === "ausente" || estado === "inasistente") {
        counts.ausentes++;
        if (isH) counts.ausentesH++;
        if (isM) counts.ausentesM++;
      } else if (estado === "comision") {
        counts.comisiones++;
        if (isH) counts.comisionesH++;
        if (isM) counts.comisionesM++;
      } else if (estado === "reposo") {
        counts.reposos++;
        if (isH) counts.reposesH++;
        if (isM) counts.reposesM++;
      } else if (estado === "pasantia") {
        counts.pasantias++;
        if (isH) counts.pasantiasH++;
        if (isM) counts.pasantiasM++;
      } else if (estado === "permiso") {
        counts.permisos++;
        if (isH) counts.permisosH++;
        if (isM) counts.permisosM++;
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
      const estado = asistencia?.estado ?? "ausente";
      if (estado === "ausente" || estado === "inasistente") {
        result.push({
          personaId: persona.id,
          nombres: persona.nombres,
          apellidos: persona.apellidos,
          ci: persona.ci,
          sexo: persona.sexo,
          pelotonNombre: pel.nombre,
          pnfNombre: pnf?.nombre ?? "",
          procesoNombre: proceso?.nombre ?? "",
          estado: "ausente",
          motivo: asistencia?.motivo ?? null,
        });
      }
    }
  }

  res.json(result);
});

router.get("/persona/:personaId", requireAuth, async (req, res) => {
  const personaId = parseInt(req.params.personaId);

  const allAsistencias = await db
    .select()
    .from(asistenciasTable)
    .then((a) => a.filter((x) => x.personaId === personaId).sort((a, b) => a.fecha.localeCompare(b.fecha)));

  const persona = await db.select().from(personasTable).where(eq(personasTable.id, personaId)).then((r) => r[0]);

  if (!persona) {
    res.status(404).json({ error: "Not Found" });
    return;
  }

  const pelotones = await db.select().from(pelotonesTable);
  const pnfs = await db.select().from(pnfsTable);
  const pelotonMap = new Map(pelotones.map((p) => [p.id, p]));
  const pnfMap = new Map(pnfs.map((p) => [p.id, p]));

  const result = {
    personaId: persona.id,
    nombres: persona.nombres,
    apellidos: persona.apellidos,
    ci: persona.ci,
    sexo: persona.sexo,
    pelotonId: persona.pelotonId,
    pelotonNombre: pelotonMap.get(persona.pelotonId)?.nombre ?? "",
    pnfNombre: pnfMap.get(pelotonMap.get(persona.pelotonId)?.pnfId ?? 0)?.nombre ?? "",
    asistencias: allAsistencias.map((a) => ({
      id: a.id,
      fecha: a.fecha,
      estado: a.estado,
      motivo: a.motivo,
      createdAt: a.createdAt.toISOString(),
    })),
  };

  res.json(result);
});

router.get("/historial", requireAuth, async (req, res) => {
  const user = (req as any).user;
  const fecha = req.query.fecha as string | undefined;
  const estado = req.query.estado as string | undefined;
  const search = req.query.search as string | undefined;
  const pelotonId = req.query.pelotonId ? parseInt(req.query.pelotonId as string) : undefined;

  const allPersonas = await db.select().from(personasTable);
  const allPelotones = await db.select().from(pelotonesTable);
  const allPnfs = await db.select().from(pnfsTable);

  let asistencias = await db
    .select()
    .from(asistenciasTable)
    .orderBy(desc(asistenciasTable.fecha), desc(asistenciasTable.updatedAt));

  if (user.rol !== "superusuario" && user.pelotonId) {
    asistencias = asistencias.filter((a) => a.pelotonId === user.pelotonId);
  } else if (pelotonId) {
    asistencias = asistencias.filter((a) => a.pelotonId === pelotonId);
  }

  if (fecha) asistencias = asistencias.filter((a) => a.fecha === fecha);
  if (estado) asistencias = asistencias.filter((a) => a.estado === estado);

  const personasMap = new Map(allPersonas.map((p) => [p.id, p]));
  const pelotonesMap = new Map(allPelotones.map((p) => [p.id, p]));
  const pnfsMap = new Map(allPnfs.map((p) => [p.id, p]));

  let result = asistencias.map((a) => {
    const persona = personasMap.get(a.personaId);
    const peloton = pelotonesMap.get(a.pelotonId);
    const pnf = peloton ? pnfsMap.get(peloton.pnfId) : undefined;
    return {
      id: a.id,
      personaId: a.personaId,
      nombres: persona?.nombres ?? "",
      apellidos: persona?.apellidos ?? "",
      ci: persona?.ci ?? "",
      sexo: persona?.sexo ?? "",
      pelotonId: a.pelotonId,
      pelotonNombre: peloton?.nombre ?? "",
      pnfNombre: pnf?.nombre ?? "",
      fecha: a.fecha,
      estado: a.estado,
      motivo: a.motivo,
    };
  });

  if (search) {
    const q = search.toLowerCase();
    result = result.filter(
      (r) =>
        r.nombres.toLowerCase().includes(q) ||
        r.apellidos.toLowerCase().includes(q) ||
        r.ci.toLowerCase().includes(q) ||
        r.pelotonNombre.toLowerCase().includes(q)
    );
  }

  res.json(result.slice(0, 500));
});

export default router;
