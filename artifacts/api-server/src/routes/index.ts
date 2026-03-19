import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth.js";
import procesosRouter from "./procesos.js";
import pnfsRouter from "./pnfs.js";
import pelotonesRouter from "./pelotones.js";
import personasRouter from "./personas.js";
import asistenciasRouter from "./asistencias.js";
import usuariosRouter from "./usuarios.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/procesos", procesosRouter);
router.use("/pnfs", pnfsRouter);
router.use("/pelotones", pelotonesRouter);
router.use("/personas", personasRouter);
router.use("/asistencias", asistenciasRouter);
router.use("/usuarios", usuariosRouter);

export default router;
