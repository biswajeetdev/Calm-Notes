import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import session from "express-session";
import connectPg from "connect-pg-simple";
import bcrypt from "bcrypt";
import rateLimit from "express-rate-limit";
import type { Express, RequestHandler } from "express";
import { db } from "../db";
import { users, type User } from "@shared/models/auth";
import { eq } from "drizzle-orm";

// Strict rate limit for auth endpoints (5 attempts per 15 min)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many attempts, please try again later" },
});

// ─── Session Setup ───────────────────────────────────────────────
export function setupAuth(app: Express) {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const PgStore = connectPg(session);

  const sessionSecret = process.env.SESSION_SECRET;
  if (!sessionSecret || sessionSecret.length < 32) {
    throw new Error("SESSION_SECRET must be set and at least 32 characters long");
  }

  app.set("trust proxy", 1);

  app.use(
    session({
      store: new PgStore({
        conString: process.env.DATABASE_URL,
        createTableIfMissing: true,
        tableName: "sessions",
      }),
      secret: sessionSecret,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: sessionTtl,
      },
    })
  );

  app.use(passport.initialize());
  app.use(passport.session());

  // ─── Local Strategy ──────────────────────────────────────────
  passport.use(
    new LocalStrategy(
      { usernameField: "email" },
      async (email, password, done) => {
        try {
          const [user] = await db
            .select()
            .from(users)
            .where(eq(users.email, email.toLowerCase()));

          if (!user) {
            return done(null, false, { message: "Invalid email or password" });
          }

          const valid = await bcrypt.compare(password, user.passwordHash);
          if (!valid) {
            return done(null, false, { message: "Invalid email or password" });
          }

          return done(null, user);
        } catch (err) {
          return done(err);
        }
      }
    )
  );

  passport.serializeUser((user: any, done) => done(null, user.id));

  passport.deserializeUser(async (id: string, done) => {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, id));
      done(null, user || null);
    } catch (err) {
      done(err);
    }
  });
}

// ─── Auth Routes ────────────────────────────────────────────────
export function registerAuthRoutes(app: Express) {
  // Register
  app.post("/api/auth/register", authLimiter, async (req, res) => {
    try {
      const { email, password, firstName, lastName } = req.body;

      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }

      if (password.length < 8) {
        return res.status(400).json({ message: "Password must be at least 8 characters" });
      }

      const existing = await db
        .select()
        .from(users)
        .where(eq(users.email, email.toLowerCase()));

      if (existing.length > 0) {
        return res.status(409).json({ message: "Email already registered" });
      }

      const passwordHash = await bcrypt.hash(password, 12);

      const [user] = await db
        .insert(users)
        .values({
          email: email.toLowerCase(),
          passwordHash,
          firstName: firstName || null,
          lastName: lastName || null,
        })
        .returning();

      // Auto-login after registration
      req.login(user, (err) => {
        if (err) {
          return res.status(500).json({ message: "Registration succeeded but login failed" });
        }
        return res.status(201).json(sanitizeUser(user));
      });
    } catch (error) {
      console.error("Registration error:", error);
      return res.status(500).json({ message: "Registration failed" });
    }
  });

  // Login
  app.post("/api/auth/login", authLimiter, (req, res, next) => {
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) return next(err);
      if (!user) {
        return res.status(401).json({ message: info?.message || "Invalid credentials" });
      }
      req.login(user, (err) => {
        if (err) return next(err);
        return res.json(sanitizeUser(user));
      });
    })(req, res, next);
  });

  // Logout
  app.post("/api/auth/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      req.session.destroy(() => {
        res.clearCookie("connect.sid");
        return res.json({ message: "Logged out" });
      });
    });
  });

  // Get current user
  app.get("/api/auth/user", isAuthenticated, (req, res) => {
    return res.json(sanitizeUser(req.user as User));
  });
}

// ─── Middleware ──────────────────────────────────────────────────
export const isAuthenticated: RequestHandler = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  return res.status(401).json({ message: "Unauthorized" });
};

// ─── Helpers ────────────────────────────────────────────────────
function sanitizeUser(user: User) {
  const { passwordHash, ...safe } = user;
  return safe;
}
