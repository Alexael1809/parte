import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const personasTable = pgTable("personas", {
  id: serial("id").primaryKey(),
  nombres: text("nombres").notNull(),
  apellidos: text("apellidos").notNull(),
  ci: text("ci").notNull().unique(),
  sexo: text("sexo").notNull(),
  pelotonId: integer("peloton_id").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertPersonaSchema = createInsertSchema(personasTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPersona = z.infer<typeof insertPersonaSchema>;
export type Persona = typeof personasTable.$inferSelect;
