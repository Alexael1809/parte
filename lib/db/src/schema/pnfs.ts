import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const pnfsTable = pgTable("pnfs", {
  id: serial("id").primaryKey(),
  nombre: text("nombre").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertPnfSchema = createInsertSchema(pnfsTable).omit({ id: true, createdAt: true });
export type InsertPnf = z.infer<typeof insertPnfSchema>;
export type Pnf = typeof pnfsTable.$inferSelect;
