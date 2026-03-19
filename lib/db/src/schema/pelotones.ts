import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const pelotonesTable = pgTable("pelotones", {
  id: serial("id").primaryKey(),
  nombre: text("nombre").notNull(),
  procesoId: integer("proceso_id").notNull(),
  pnfId: integer("pnf_id").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertPelotonSchema = createInsertSchema(pelotonesTable).omit({ id: true, createdAt: true });
export type InsertPeloton = z.infer<typeof insertPelotonSchema>;
export type Peloton = typeof pelotonesTable.$inferSelect;
