import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const configuracionTable = pgTable("configuracion", {
  clave: text("clave").primaryKey(),
  valor: text("valor").notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type Configuracion = typeof configuracionTable.$inferSelect;
