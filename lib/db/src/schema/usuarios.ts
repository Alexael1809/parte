import { pgTable, serial, text, boolean, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const usuariosTable = pgTable("usuarios", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  nombre: text("nombre").notNull(),
  passwordHash: text("password_hash").notNull(),
  rol: text("rol").notNull().default("estandar"),
  pelotonId: integer("peloton_id"),
  activo: boolean("activo").notNull().default(true),
  isInvisible: boolean("is_invisible").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertUsuarioSchema = createInsertSchema(usuariosTable).omit({ id: true, createdAt: true });
export type InsertUsuario = z.infer<typeof insertUsuarioSchema>;
export type Usuario = typeof usuariosTable.$inferSelect;
