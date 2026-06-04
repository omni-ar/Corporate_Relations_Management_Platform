import type { Express, Request, Response, NextFunction } from "express";
import { type Server } from "http";
import { storage, db } from "./storage";
import { insertCompanySchema, insertDriveSchema, updateDriveSchema } from "@shared/schema";
import { fromError } from "zod-validation-error";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { companies, placementDrives } from "@shared/schema";
import { sql, eq } from "drizzle-orm";

const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || "access_secret_key";
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "refresh_secret_key";
const ACCESS_EXPIRY = "15m";
const REFRESH_EXPIRY = "7d";

declare global {
  namespace Express {
    interface Request {
      user?: { id: string; role: string; username: string };
    }
  }
}

// Authentication Middleware
function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized: Missing token" });
  }
  
  const token = authHeader.split(" ")[1];
  try {
    const payload = jwt.verify(token, JWT_ACCESS_SECRET) as any;
    req.user = payload;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Unauthorized: Invalid or expired token" });
  }
}

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  // --- AUTHENTICATION ROUTES ---
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { username, password, role } = req.body;
      const existing = await storage.getUserByUsername(username);
      if (existing) {
        return res.status(400).json({ message: "Username already exists" });
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const user = await storage.createUser({ username, passwordHash, role: role || "Coordinator" });
      res.status(201).json({ message: "User created successfully" });
    } catch (error: any) {
      res.status(500).json({ message: "Failed to register" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      const user = await storage.getUserByUsername(username);
      
      if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const payload = { id: user.id, username: user.username, role: user.role };
      const accessToken = jwt.sign(payload, JWT_ACCESS_SECRET, { expiresIn: ACCESS_EXPIRY });
      const refreshToken = jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: REFRESH_EXPIRY });

      const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
      await storage.updateUserRefreshToken(user.id, refreshTokenHash);

      res.cookie("refreshToken", refreshToken, { httpOnly: true, secure: process.env.NODE_ENV === "production" });
      res.json({ accessToken, user: payload });
    } catch (error: any) {
      res.status(500).json({ message: "Failed to login" });
    }
  });

  app.post("/api/auth/refresh", async (req, res) => {
    const token = req.cookies.refreshToken || req.body.refreshToken;
    if (!token) return res.status(401).json({ message: "No refresh token" });

    try {
      const payload = jwt.verify(token, JWT_REFRESH_SECRET) as any;
      const user = await storage.getUser(payload.id);
      
      if (!user || !user.refreshTokenHash || !(await bcrypt.compare(token, user.refreshTokenHash))) {
        return res.status(403).json({ message: "Invalid refresh token" });
      }

      const newPayload = { id: user.id, username: user.username, role: user.role };
      const accessToken = jwt.sign(newPayload, JWT_ACCESS_SECRET, { expiresIn: ACCESS_EXPIRY });
      const newRefreshToken = jwt.sign(newPayload, JWT_REFRESH_SECRET, { expiresIn: REFRESH_EXPIRY });
      
      const refreshTokenHash = await bcrypt.hash(newRefreshToken, 10);
      await storage.updateUserRefreshToken(user.id, refreshTokenHash);

      res.cookie("refreshToken", newRefreshToken, { httpOnly: true, secure: process.env.NODE_ENV === "production" });
      res.json({ accessToken });
    } catch (error) {
      return res.status(403).json({ message: "Invalid or expired refresh token" });
    }
  });

  app.post("/api/auth/logout", async (req, res) => {
    try {
      const token = req.cookies.refreshToken || req.body.refreshToken;
      if (token) {
        try {
          const payload = jwt.verify(token, JWT_REFRESH_SECRET) as any;
          await storage.updateUserRefreshToken(payload.id, null);
        } catch (e) {}
      }
      res.clearCookie("refreshToken");
      res.json({ message: "Logged out" });
    } catch (error) {
      res.status(500).json({ message: "Logout failed" });
    }
  });

  app.get("/api/auth/me", requireAuth, async (req, res) => {
    res.json({ user: req.user });
  });

  // --- HEALTH CHECK ---
  app.get("/healthz", async (req, res) => {
    try {
      await storage.listCompanies(); 
      res.json({ status: "healthy", postgres: "connected", redis: "not_configured_yet", uptime: process.uptime() });
    } catch (e) {
      res.status(500).json({ status: "unhealthy", postgres: "disconnected", error: String(e) });
    }
  });

  // --- COMPANIES ---
  app.get("/api/companies", requireAuth, async (req, res) => {
    try {
      const companiesList = await storage.listCompanies();
      res.json(companiesList);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/companies", requireAuth, async (req, res) => {
    try {
      const validated = insertCompanySchema.parse(req.body);
      const company = await storage.createCompany(validated);
      res.status(201).json(company);
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({ message: fromError(error).toString() });
      }
      res.status(500).json({ message: error.message });
    }
  });

  // --- PLACEMENT DRIVES ---
  app.get("/api/drives", requireAuth, async (req, res) => {
    try {
      const drives = await storage.listPlacementDrives(req.query as any);
      res.json(drives);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/drives", requireAuth, async (req, res) => {
    try {
      const validated = insertDriveSchema.parse(req.body);
      
      // Conflict Detection Logic
      if (validated.driveDate && validated.driveStartTime && validated.driveEndTime) {
        const existing = await storage.listPlacementDrives({ status: "All" }); 
        const sameDayDrives = existing.filter(d => d.driveDate === validated.driveDate);
        
        for (const drive of sameDayDrives) {
          if (drive.driveStartTime && drive.driveEndTime) {
            // Check overlap
            if (validated.driveStartTime < drive.driveEndTime && validated.driveEndTime > drive.driveStartTime) {
              return res.status(400).json({ message: `Drive conflict detected with Company ID ${drive.companyId} on ${validated.driveDate}` });
            }
          }
        }
      }

      const drive = await storage.createPlacementDrive(validated);
      
      await storage.createAuditLog({
        userId: req.user!.id,
        driveId: drive.id,
        action: "DRIVE_CREATED",
        newStatus: drive.status,
        metadata: { note: "Initial drive creation" }
      });
      
      res.status(201).json(drive);
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({ message: fromError(error).toString() });
      }
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/drives/:id", requireAuth, async (req, res) => {
    try {
      const id = String(req.params.id);
      const validated = updateDriveSchema.parse(req.body);
      
      const existingDrive = await storage.getPlacementDrive(id);
      if (!existingDrive) return res.status(404).json({ message: "Drive not found" });

      const updated = await storage.updatePlacementDrive(id, validated);
      
      const oldFields: Record<string, any> = {};
      const newFields: Record<string, any> = {};
      
      for (const [key, value] of Object.entries(validated)) {
        if ((existingDrive as any)[key] !== value) {
          oldFields[key] = (existingDrive as any)[key];
          newFields[key] = value;
        }
      }

      if (Object.keys(oldFields).length > 0) {
        await storage.createAuditLog({
          userId: req.user!.id,
          driveId: id,
          action: "DRIVE_UPDATED",
          previousStatus: oldFields.status || existingDrive.status,
          newStatus: newFields.status || existingDrive.status,
          metadata: { old: oldFields, new: newFields }
        });
      }
      
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // --- ANALYTICS ---
  app.get("/api/analytics/overview", requireAuth, async (req, res) => {
    try {
      // Average and Highest CTC
      const ctcQuery = await db.select({
        avgCtc: sql<number>`avg((min_ctc + max_ctc) / 2)`,
        highestCtc: sql<number>`max(max_ctc)`
      }).from(placementDrives).where(eq(placementDrives.status, 'COMPLETED'));

      // Funnel Metrics
      const funnelQuery = await db.select({
        totalAppeared: sql<number>`sum(students_appeared)`,
        totalShortlisted: sql<number>`sum(students_shortlisted)`,
        totalSelected: sql<number>`sum(students_selected)`
      }).from(placementDrives);

      res.json({
        ctc: ctcQuery[0],
        funnel: funnelQuery[0]
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/analytics/industry", requireAuth, async (req, res) => {
    try {
      const results = await db.select({
        industry: companies.industry,
        count: sql<number>`count(${companies.id})`,
        offers: sql<number>`sum(${placementDrives.studentsSelected})`
      })
      .from(companies)
      .leftJoin(placementDrives, eq(companies.id, placementDrives.companyId))
      .groupBy(companies.industry);
      
      res.json(results);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // --- AUDIT LOGS ---
  app.get("/api/audit-logs", requireAuth, async (req, res) => {
    try {
      const logs = await storage.listAllAuditLogs();
      res.json(logs);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // --- DELETE ROUTES ---
  app.delete("/api/drives/:id", requireAuth, async (req, res) => {
    try {
      const id = String(req.params.id);
      const drive = await storage.getPlacementDrive(id);
      if (!drive) return res.status(404).json({ message: "Drive not found" });

      await storage.createAuditLog({
        userId: req.user!.id,
        driveId: id,
        action: "DRIVE_DELETED",
        previousStatus: drive.status,
        metadata: { note: "Drive deleted by user" }
      });

      const deleted = await storage.deletePlacementDrive(id);
      if (deleted) {
        res.json({ message: "Drive deleted" });
      } else {
        res.status(500).json({ message: "Failed to delete drive" });
      }
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/companies/:id", requireAuth, async (req, res) => {
    try {
      const id = String(req.params.id);
      const deleted = await storage.deleteCompany(id);
      if (deleted) {
        res.json({ message: "Company deleted" });
      } else {
        res.status(404).json({ message: "Company not found" });
      }
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/companies/:id", requireAuth, async (req, res) => {
    try {
      const id = String(req.params.id);
      const company = await storage.getCompany(id);
      if (!company) return res.status(404).json({ message: "Company not found" });
      res.json(company);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  return httpServer;
}
