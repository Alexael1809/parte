import { pgTable, serial, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const procesosTable = pgTable("procesos", {
  id: serial("id").primaryKey(),
  nombre: text("nombre").notNull(),
  activo: boolean("activo").notNull().default(true),
  fechaArchivado: timestamp("fecha_archivado"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertProcesoSchema = createInsertSchema(procesosTable).omit({ id: true, createdAt: true });
export type InsertProceso = z.infer<typeof insertProcesoSchema>;
export type Proceso = typeof procesosTable.$inferSelect;
