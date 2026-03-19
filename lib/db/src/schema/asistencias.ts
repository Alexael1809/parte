import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const asistenciasTable = pgTable("asistencias", {
  id: serial("id").primaryKey(),
  personaId: integer("persona_id").notNull(),
  pelotonId: integer("peloton_id").notNull(),
  fecha: text("fecha").notNull(),
  estado: text("estado").notNull().default("inasistente"),
  motivo: text("motivo"),
  usuarioId: integer("usuario_id").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertAsistenciaSchema = createInsertSchema(asistenciasTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertAsistencia = z.infer<typeof insertAsistenciaSchema>;
export type Asistencia = typeof asistenciasTable.$inferSelect;
