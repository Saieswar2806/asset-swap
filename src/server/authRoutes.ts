import { Router, Request, Response } from "express";
import crypto from "node:crypto";
import { db } from "./db.js";
import { createSession, destroySession, requireAuth, type AuthUser } from "./auth.js";
import { hashPassword, verifyPassword } from "./password.js";

export const authRouter = Router();

// ==========================================
// 1. Login (Email + Password)
// ==========================================
authRouter.post("/login", (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: "Email and password are required."
      });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const user = db.prepare("SELECT * FROM users WHERE LOWER(email) = ?").get(cleanEmail) as (AuthUser & { passwordHash: string }) | undefined;

    if (!user) {
      return res.status(401).json({
        success: false,
        error: "Invalid email address or password."
      });
    }

    // Verify Password
    const isValid = verifyPassword(String(password), user.passwordHash);
    if (!isValid) {
      return res.status(401).json({
        success: false,
        error: "Invalid email address or password."
      });
    }

    // Check account status
    if (user.status === "suspended") {
      return res.status(403).json({
        success: false,
        error: "Your account has been suspended by administration. Please contact support."
      });
    }

    if (user.status === "rejected") {
      return res.status(403).json({
        success: false,
        error: `Your account registration was rejected: ${user.rejectionReason || "Criteria not met"}`
      });
    }

    // Create session
    const session = createSession(user.id);

    // Set HTTP-Only Cookie
    res.cookie("asset_swap_session", session.token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    // Record audit log
    db.prepare(`
      INSERT INTO audit_logs (id, entityType, entityId, action, details, performedBy, timestamp)
      VALUES (?, 'auth', ?, 'user_login', ?, ?, ?)
    `).run(
      `log-${Date.now()}`,
      user.id,
      JSON.stringify({ role: user.role, email: user.email }),
      user.name,
      new Date().toISOString()
    );

    // Return sanitized user without passwordHash
    const { passwordHash: _, ...safeUser } = user;

    res.json({
      success: true,
      message: "Login successful.",
      token: session.token,
      user: safeUser,
      data: {
        token: session.token,
        user: safeUser
      }
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: message });
  }
});

// ==========================================
// 2. Property Owner Public Registration
// ==========================================
authRouter.post("/register", (req: Request, res: Response) => {
  try {
    const { name, email, phone, password, confirmPassword } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        error: "Name, email, and password are required."
      });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return res.status(400).json({
        success: false,
        error: "Please enter a valid email address."
      });
    }

    if (String(password).length < 6) {
      return res.status(400).json({
        success: false,
        error: "Password must be at least 6 characters in length."
      });
    }

    if (confirmPassword && password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        error: "Passwords do not match."
      });
    }

    // Check duplicate email
    const existing = db.prepare("SELECT id FROM users WHERE LOWER(email) = ?").get(cleanEmail);
    if (existing) {
      return res.status(400).json({
        success: false,
        error: "An account with this email address already exists."
      });
    }

    // Security rule: Public registration strictly assigns role 'owner' and status 'active'
    const userId = `OWNER-${Date.now().toString().slice(-6)}`;
    const now = new Date().toISOString();
    const hashed = hashPassword(String(password));

    db.prepare(`
      INSERT INTO users (
        id, name, email, passwordHash, role, status, phone,
        agency, licenseNumber, jurisdiction, experienceYears, rejectionReason,
        createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, 'owner', 'active', ?, NULL, NULL, NULL, NULL, NULL, ?, ?)
    `).run(
      userId,
      String(name).trim(),
      cleanEmail,
      hashed,
      phone ? String(phone).trim() : null,
      now,
      now
    );

    // Create session
    const session = createSession(userId);

    res.cookie("asset_swap_session", session.token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    // Record audit log
    db.prepare(`
      INSERT INTO audit_logs (id, entityType, entityId, action, details, performedBy, timestamp)
      VALUES (?, 'user', ?, 'owner_registered', ?, ?, ?)
    `).run(
      `log-${Date.now()}`,
      userId,
      JSON.stringify({ email: cleanEmail }),
      name,
      now
    );

    const newUser: AuthUser = {
      id: userId,
      name: String(name).trim(),
      email: cleanEmail,
      role: "owner",
      status: "active",
      phone: phone ? String(phone).trim() : undefined,
      createdAt: now,
      updatedAt: now
    };

    res.status(201).json({
      success: true,
      message: "Owner account registered successfully.",
      token: session.token,
      user: newUser,
      data: {
        token: session.token,
        user: newUser
      }
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: message });
  }
});

// ==========================================
// 3. Broker Application Onboarding
// ==========================================
authRouter.post("/broker-apply", (req: Request, res: Response) => {
  try {
    const { name, email, phone, password, agency, licenseNumber, jurisdiction, experienceYears } = req.body;

    if (!name || !email || !password || !licenseNumber) {
      return res.status(400).json({
        success: false,
        error: "Name, email, password, and professional license number are mandatory."
      });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const existing = db.prepare("SELECT id FROM users WHERE LOWER(email) = ?").get(cleanEmail);
    if (existing) {
      return res.status(400).json({
        success: false,
        error: "An account with this email address is already registered."
      });
    }

    // Broker accounts strictly enter in 'pending' status awaiting admin approval
    const brokerId = `broker-${Date.now().toString().slice(-4)}`;
    const now = new Date().toISOString();
    const hashed = hashPassword(String(password));

    db.prepare(`
      INSERT INTO users (
        id, name, email, passwordHash, role, status, phone,
        agency, licenseNumber, jurisdiction, experienceYears, rejectionReason,
        createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, 'broker', 'pending', ?, ?, ?, ?, ?, NULL, ?, ?)
    `).run(
      brokerId,
      String(name).trim(),
      cleanEmail,
      hashed,
      phone ? String(phone).trim() : null,
      agency ? String(agency).trim() : "Independent Realty Consultant",
      String(licenseNumber).trim(),
      jurisdiction ? String(jurisdiction).trim() : "Karnataka Districts",
      experienceYears ? Number(experienceYears) : 1,
      now,
      now
    );

    // Audit log
    db.prepare(`
      INSERT INTO audit_logs (id, entityType, entityId, action, details, performedBy, timestamp)
      VALUES (?, 'broker', ?, 'broker_application_submitted', ?, ?, ?)
    `).run(
      `log-${Date.now()}`,
      brokerId,
      JSON.stringify({ licenseNumber, agency }),
      name,
      now
    );

    const newBrokerUser: AuthUser = {
      id: brokerId,
      name: String(name).trim(),
      email: cleanEmail,
      role: "broker",
      status: "pending",
      phone: phone ? String(phone).trim() : undefined,
      agency: agency ? String(agency).trim() : "Independent Realty Consultant",
      licenseNumber: String(licenseNumber).trim(),
      jurisdiction: jurisdiction ? String(jurisdiction).trim() : "Karnataka Districts",
      experienceYears: experienceYears ? Number(experienceYears) : 1,
      createdAt: now,
      updatedAt: now
    };

    res.status(201).json({
      success: true,
      message: "Broker registration application submitted successfully. Your account is currently pending administrator verification.",
      brokerId,
      user: newBrokerUser,
      data: {
        brokerId,
        user: newBrokerUser
      }
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: message });
  }
});

// ==========================================
// 4. Current Authenticated User (Session Check)
// ==========================================
authRouter.get("/me", (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: "No active session. Please log in."
    });
  }

  res.json({
    success: true,
    user: req.user,
    data: req.user
  });
});

// ==========================================
// 5. Logout
// ==========================================
authRouter.post("/logout", (req: Request, res: Response) => {
  if (req.sessionToken) {
    destroySession(req.sessionToken);
  }
  res.clearCookie("asset_swap_session", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production"
  });
  res.json({
    success: true,
    message: "Logged out successfully."
  });
});

// ==========================================
// 6. Profile & Settings Update
// ==========================================
authRouter.put("/profile", requireAuth, (req: Request, res: Response) => {
  try {
    const currentUser = req.user!;
    const { name, phone, agency, jurisdiction, currentPassword, newPassword } = req.body;

    const now = new Date().toISOString();
    const updates: string[] = ["updatedAt = ?"];
    const params: unknown[] = [now];

    if (name) {
      updates.push("name = ?");
      params.push(String(name).trim());
    }
    if (phone !== undefined) {
      updates.push("phone = ?");
      params.push(phone ? String(phone).trim() : null);
    }
    if (agency !== undefined && currentUser.role === "broker") {
      updates.push("agency = ?");
      params.push(agency ? String(agency).trim() : null);
    }
    if (jurisdiction !== undefined && currentUser.role === "broker") {
      updates.push("jurisdiction = ?");
      params.push(jurisdiction ? String(jurisdiction).trim() : null);
    }

    // Password change
    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({
          success: false,
          error: "Current password is required to set a new password."
        });
      }

      const row = db.prepare("SELECT passwordHash FROM users WHERE id = ?").get(currentUser.id) as { passwordHash: string };
      if (!verifyPassword(String(currentPassword), row.passwordHash)) {
        return res.status(400).json({
          success: false,
          error: "Current password does not match."
        });
      }

      updates.push("passwordHash = ?");
      params.push(hashPassword(String(newPassword)));
    }

    params.push(currentUser.id);
    db.prepare(`UPDATE users SET ${updates.join(", ")} WHERE id = ?`).run(...params);

    const updatedUser = db.prepare("SELECT * FROM users WHERE id = ?").get(currentUser.id) as AuthUser;
    delete (updatedUser as any).passwordHash;

    res.json({
      success: true,
      message: "Profile updated successfully.",
      user: updatedUser,
      data: updatedUser
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: message });
  }
});
