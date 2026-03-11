import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./auth";
import { registerBillingRoutes, getUserSubscription, getUserUsage, PLANS, type PlanKey } from "./billing";
import { api } from "@shared/routes";
import { z } from "zod";
import { db } from "./db";
import { usage, type InsertNote } from "@shared/schema";
import { eq, sql } from "drizzle-orm";
import OpenAI from "openai";
import rateLimit from "express-rate-limit";

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

if (!openai) {
  console.warn("OPENAI_API_KEY not set — AI generation disabled");
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Setup Auth
  setupAuth(app);
  registerAuthRoutes(app);
  registerBillingRoutes(app);

  // Rate limit all API routes (100 req/15min per IP)
  app.use("/api", rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Too many requests, please try again later" },
  }));

  // Protected Notes Routes
  app.get(api.notes.list.path, isAuthenticated, async (req, res) => {
    const userId = (req.user as any).id;
    const notes = await storage.getNotes(userId);
    res.json(notes);
  });

  app.get(api.notes.get.path, isAuthenticated, async (req, res) => {
    const noteId = Number(req.params.id);
    const note = await storage.getNote(noteId);
    
    if (!note) {
      return res.status(404).json({ message: "Note not found" });
    }
    
    const userId = (req.user as any).id;
    if (note.userId !== userId) {
       return res.status(401).json({ message: "Unauthorized access to note" });
    }

    res.json(note);
  });

  app.post(api.notes.create.path, isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).id;

      const inputWithoutUser = api.notes.create.input.parse(req.body);
      const notePayload: InsertNote = {
        ...inputWithoutUser,
        userId,
      };
      const note = await storage.createNote(notePayload);
      res.status(201).json(note);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.put(api.notes.update.path, isAuthenticated, async (req, res) => {
    try {
      const noteId = Number(req.params.id);
      const note = await storage.getNote(noteId);
      
      if (!note) {
        return res.status(404).json({ message: "Note not found" });
      }

      const userId = (req.user as any).id;
      if (note.userId !== userId) {
        return res.status(401).json({ message: "Unauthorized access to note" });
      }

      const inputWithoutUser = api.notes.update.input.parse(req.body);
      const updatePayload: Partial<InsertNote> = {
        ...inputWithoutUser,
        userId,
      };
      const updatedNote = await storage.updateNote(noteId, updatePayload);
      res.json(updatedNote);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.delete(api.notes.delete.path, isAuthenticated, async (req, res) => {
      const noteId = Number(req.params.id);
      const note = await storage.getNote(noteId);
      
      if (!note) {
        return res.status(404).json({ message: "Note not found" });
      }

      const userId = (req.user as any).id;
      if (note.userId !== userId) {
        return res.status(401).json({ message: "Unauthorized access to note" });
      }

      await storage.deleteNote(noteId);
      res.status(204).send();
  });

  // ─── PDF Export ────────────────────────────────────────────────
  app.get("/api/notes/:id/export/pdf", isAuthenticated, async (req, res) => {
    const noteId = Number(req.params.id);
    const note = await storage.getNote(noteId);

    if (!note) return res.status(404).json({ message: "Note not found" });

    const userId = (req.user as any).id;
    if (note.userId !== userId) return res.status(401).json({ message: "Unauthorized" });

    const PDFDocument = (await import("pdfkit")).default;
    const doc = new PDFDocument({ margin: 50, size: "LETTER" });

    // Clean up PDF stream if client disconnects
    req.on("close", () => { if (!res.writableFinished) doc.end(); });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${(note.clientName || "note").replace(/[^a-zA-Z0-9]/g, "_")}_${note.selectedFormat || "SOAP"}.pdf"`
    );
    doc.pipe(res);

    // Header
    doc.fontSize(20).font("Helvetica-Bold").text("CalmNotes", { align: "center" });
    doc.moveDown(0.3);
    doc.fontSize(10).font("Helvetica").fillColor("#666")
      .text("Clinical Documentation", { align: "center" });
    doc.moveDown(1);

    // Separator
    doc.strokeColor("#ddd").lineWidth(1)
      .moveTo(50, doc.y).lineTo(562, doc.y).stroke();
    doc.moveDown(0.5);

    // Meta
    doc.fontSize(11).fillColor("#333").font("Helvetica-Bold");
    if (note.clientName) doc.text(`Client: ${note.clientName}`);
    if (note.sessionDate) {
      const d = new Date(note.sessionDate);
      doc.font("Helvetica").text(`Date: ${d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`);
    }
    if (note.sessionType) doc.text(`Type: ${note.sessionType}`);
    if (note.selectedFormat) doc.font("Helvetica-Bold").text(`Format: ${note.selectedFormat}`);
    if (note.riskFlags) {
      doc.moveDown(0.3);
      doc.fillColor("#c00").font("Helvetica-Bold").text(`⚠ Risk Flags: ${note.riskFlags}`);
    }

    doc.moveDown(0.8);
    doc.strokeColor("#ddd").lineWidth(1)
      .moveTo(50, doc.y).lineTo(562, doc.y).stroke();
    doc.moveDown(0.5);

    // Content
    const content = (note.structuredOutput as any)?.content || note.rawNotes || "No content.";
    doc.fontSize(10).fillColor("#222").font("Helvetica").text(content, {
      lineGap: 4,
      paragraphGap: 8,
    });

    // Footer
    doc.moveDown(2);
    doc.fontSize(8).fillColor("#999")
      .text(`Generated by CalmNotes • Note ID: ${note.id} • ${new Date().toISOString().split("T")[0]}`, { align: "center" });

    doc.end();
  });

  // Generate Note using AI (with usage gating)
  app.post(api.notes.generate.path, isAuthenticated, async (req, res) => {
    try {
      if (!openai) {
        return res.status(503).json({ message: "AI generation not configured. Set OPENAI_API_KEY." });
      }

      const userId = (req.user as any).id;

      // Check usage limits
      const sub = await getUserSubscription(userId);
      const userUsage = await getUserUsage(userId);
      const plan = (sub?.plan || "free") as PlanKey;
      const limit = PLANS[plan]?.generationsPerMonth ?? PLANS.free.generationsPerMonth;
      const currentCount = userUsage?.generationsCount || 0;

      if (limit !== Infinity && currentCount >= limit) {
        return res.status(429).json({
          message: `Free plan limit reached (${limit} generations/month). Upgrade to Pro for unlimited access.`,
          code: "USAGE_LIMIT_EXCEEDED",
        });
      }

      const { rawNotes, transcript, format, clientName, sessionType, riskFlags } = req.body;

      if (!rawNotes && !transcript) {
        return res.status(400).json({ message: "Either raw notes or transcript is required." });
      }

      const systemPrompt = `You are a clinical documentation assistant. 
      Your task is to generate a professional, clinically sound session note in ${format} format.
      
      Format Definitions:
      - SOAP: Subjective, Objective, Assessment, Plan
      - DAP: Data, Assessment, Plan
      - BIRP: Behavior, Intervention, Response, Plan

      Guidelines:
      - Use professional, objective, clinical language.
      - Maintain patient privacy (do not hallucinate identifying details if not provided).
      - Highlight any provided risk factors clearly.
      - If risk flags are provided: ${riskFlags || "None"}, ensure they are addressed in the assessment/intervention.
      - Session Type: ${sessionType || "Not specified"}.
      - Client Name: ${clientName || "Client"}.

      Input Data:
      ${rawNotes ? `Raw Notes: ${rawNotes}` : ""}
      ${transcript ? `Transcript: ${transcript}` : ""}
      
      Output the note structure clearly. Do not include conversational filler. Just the note content.`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: "Generate the note." }
        ],
        max_completion_tokens: 1500, // Reasonable limit for a note
        temperature: 0.7,
      });

      const generatedContent = response.choices[0].message.content || "Failed to generate note.";

      // Increment usage counter
      await db
        .insert(usage)
        .values({ userId, generationsCount: 1, periodStart: new Date() })
        .onConflictDoUpdate({
          target: usage.userId,
          set: { generationsCount: sql`${usage.generationsCount} + 1` },
        });

      res.json({
        content: generatedContent,
        format: format,
      });

    } catch (error: any) {
      console.error("AI Generation Error:", error);
      res.status(500).json({ message: "Failed to generate note: " + error.message });
    }
  });

  return httpServer;
}
