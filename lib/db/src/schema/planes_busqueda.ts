import { pgTable, serial, text, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const planesBusquedaTable = pgTable("planes_busqueda", {
  id: serial("id").primaryKey(),
  personaId: integer("persona_id").notNull().unique(),
  telefono1: text("telefono1"),
  telefono2: text("telefono2"),
  telefono3: text("telefono3"),
  direccion: text("direccion"),
  lugarOrigen: text("lugar_origen"),
});

export const insertPlanBusquedaSchema = createInsertSchema(planesBusquedaTable).omit({ id: true });
export type InsertPlanBusqueda = z.infer<typeof insertPlanBusquedaSchema>;
export type PlanBusqueda = typeof planesBusquedaTable.$inferSelect;
