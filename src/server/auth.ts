import crypto from "node:crypto";
import type { Request, Response, NextFunction } from "express";
import { db } from "./db.js";
import { hashPassword, verifyPassword } from "./password.js";
import type { User as AuthUser } from "../types.js";

export type { AuthUser };
export { hashPassword, verifyPassword };

// Extend Express Request
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      sessionToken?: string;
    }
  }
}

/**
 * Create a new session in SQLite
 */
export function createSession(userId: string): { token: string; expiresAt: string } {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days
  const createdAt = new Date().toISOString();

  db.prepare(`
    INSERT INTO sessions (token, userId, expiresAt, createdAt)
    VALUES (?, ?, ?, ?)
  `).run(token, userId, expiresAt, createdAt);

  return { token, expiresAt };
}

/**
 * Delete session by token (logout)
 */
export function destroySession(token: string): void {
  db.prepare("DELETE FROM sessions WHERE token = ?").run(token);
}

/**
 * Retrieve user by valid session token
 */
export function getUserFromSession(token: string): AuthUser | null {
  try {
    const row = db.prepare(`
      SELECT u.*
      FROM sessions s
      JOIN users u ON s.userId = u.id
      WHERE s.token = ? AND s.expiresAt > datetime('now')
    `).get(token) as AuthUser | undefined;

    return row || null;
  } catch {
    return null;
  }
}

/**
 * Authentication extraction middleware: populates req.user if session cookie/token present
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const token = (req.cookies && req.cookies.asset_swap_session) ||
    (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")
      ? req.headers.authorization.slice(7)
      : null);

  if (token) {
    req.sessionToken = token;
    const user = getUserFromSession(token);
    if (user) {
      req.user = user;
    }
  }

  next();
}

/**
 * Require valid authentication middleware (rejects unauthenticated or suspended accounts)
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: "Authentication required. Please log in to proceed."
    });
  }

  if (req.user.status === "suspended") {
    return res.status(403).json({
      success: false,
      error: "Your account has been suspended by administration."
    });
  }

  if (req.user.status === "pending" && req.user.role === "broker") {
    return res.status(403).json({
      success: false,
      error: "Your broker application is currently pending admin approval."
    });
  }

  if (req.user.status === "rejected") {
    return res.status(403).json({
      success: false,
      error: "Your account registration was not approved."
    });
  }

  next();
}

/**
 * Require specific role(s) middleware
 */
export function requireRole(...roles: Array<"admin" | "broker" | "owner">) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: "Authentication required."
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `Forbidden: Access restricted to ${roles.join(" or ")} accounts.`
      });
    }

    next();
  };
}
