import { z } from 'zod';
import { insertNoteSchema, noteInputSchema, notes } from './schema';

// ============================================
// SHARED ERROR SCHEMAS
// ============================================
export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
  unauthorized: z.object({
    message: z.string(),
  }),
};

// ============================================
// API CONTRACT
// ============================================
export const api = {
  notes: {
    list: {
      method: 'GET' as const,
      path: '/api/notes' as const,
      responses: {
        200: z.array(z.custom<typeof notes.$inferSelect>()),
        401: errorSchemas.unauthorized,
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/notes/:id' as const,
      responses: {
        200: z.custom<typeof notes.$inferSelect>(),
        404: errorSchemas.notFound,
        401: errorSchemas.unauthorized,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/notes' as const,
      input: noteInputSchema,
      responses: {
        201: z.custom<typeof notes.$inferSelect>(),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/notes/:id' as const,
      input: noteInputSchema.partial(),
      responses: {
        200: z.custom<typeof notes.$inferSelect>(),
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
        401: errorSchemas.unauthorized,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/notes/:id' as const,
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
        401: errorSchemas.unauthorized,
      },
    },
    generate: {
      method: 'POST' as const,
      path: '/api/notes/generate' as const,
      input: z.object({
        rawNotes: z.string().optional(),
        transcript: z.string().optional(),
        format: z.enum(["SOAP", "DAP", "BIRP"]),
        clientName: z.string().optional(),
        sessionType: z.string().optional(),
        riskFlags: z.string().optional(),
      }),
      responses: {
        200: z.object({
          content: z.string(),
          format: z.enum(["SOAP", "DAP", "BIRP"]),
        }),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
      },
    }
  },
};

// ============================================
// REQUIRED: buildUrl helper
// ============================================
export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}

// ============================================
// TYPE HELPERS
// ============================================
export type NoteInput = z.infer<typeof api.notes.create.input>;
export type NoteResponse = z.infer<typeof api.notes.create.responses[201]>;
export type NoteUpdateInput = z.infer<typeof api.notes.update.input>;
export type GenerateNoteInput = z.infer<typeof api.notes.generate.input>;
export type GenerateNoteResponse = z.infer<typeof api.notes.generate.responses[200]>;
