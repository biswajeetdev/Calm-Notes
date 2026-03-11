import { pgTable, text, serial, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export * from "./models/auth";
export * from "./models/subscription";

// === TABLE DEFINITIONS ===

export const notes = pgTable("notes", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(), // Links to auth.users.id
  clientName: text("client_name"),
  sessionDate: timestamp("session_date").defaultNow(),
  sessionType: text("session_type"), // e.g., "Individual", "Couples", "Family"
  riskFlags: text("risk_flags"), // Comma-separated or JSON? Let's use text for simplicity in MVP
  rawNotes: text("raw_notes"),
  transcript: text("transcript"),
  
  // Generated content
  structuredOutput: jsonb("structured_output"), // Stores { soap: "...", dap: "...", birp: "..." }
  selectedFormat: text("selected_format").default("SOAP"), // "SOAP" | "DAP" | "BIRP"
  
  isFavorite: boolean("is_favorite").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// === BASE SCHEMAS ===
export const insertNoteSchema = createInsertSchema(notes).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true,
});

// Schema for API input (userId is always set server-side)
export const noteInputSchema = insertNoteSchema.omit({
  userId: true,
});

// === EXPLICIT API CONTRACT TYPES ===

// Base types
export type Note = typeof notes.$inferSelect;
export type InsertNote = z.infer<typeof insertNoteSchema>;

// Request types
export type CreateNoteRequest = z.infer<typeof noteInputSchema>;
export type UpdateNoteRequest = Partial<CreateNoteRequest>;

// Response types
export type NoteResponse = Note;
export type NotesListResponse = Note[];

// AI Generation Request
export interface GenerateNoteRequest {
  rawNotes?: string;
  transcript?: string;
  format: "SOAP" | "DAP" | "BIRP";
  clientName?: string;
  sessionType?: string;
  riskFlags?: string;
}

export interface GenerateNoteResponse {
  content: string;
  format: "SOAP" | "DAP" | "BIRP";
}
