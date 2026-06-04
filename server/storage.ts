import { eq, and, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";
import {
  type User,
  type Company,
  type PlacementDrive,
  type AuditLog,
  users,
  companies,
  placementDrives,
  auditLogs,
} from "@shared/schema";
import { z } from "zod";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

export const db = drizzle(pool, { schema });

type InsertUser = z.infer<typeof schema.insertUserSchema>;
type InsertCompany = z.infer<typeof schema.insertCompanySchema>;
type InsertDrive = z.infer<typeof schema.insertDriveSchema>;
type UpdateDrive = z.infer<typeof schema.updateDriveSchema>;
type InsertAuditLog = typeof auditLogs.$inferInsert;

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserRefreshToken(id: string, tokenHash: string | null): Promise<void>;

  listCompanies(): Promise<Company[]>;
  getCompany(id: string): Promise<Company | undefined>;
  createCompany(company: InsertCompany): Promise<Company>;

  listPlacementDrives(filters?: { companyId?: string; status?: string }): Promise<PlacementDrive[]>;
  getPlacementDrive(id: string): Promise<PlacementDrive | undefined>;
  createPlacementDrive(drive: InsertDrive): Promise<PlacementDrive>;
  updatePlacementDrive(id: string, drive: UpdateDrive): Promise<PlacementDrive | undefined>;
  deletePlacementDrive(id: string): Promise<boolean>;

  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;
  listAuditLogs(driveId: string): Promise<AuditLog[]>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUserRefreshToken(id: string, tokenHash: string | null): Promise<void> {
    await db.update(users).set({ refreshTokenHash: tokenHash }).where(eq(users.id, id));
  }

  async listCompanies(): Promise<Company[]> {
    return await db.select().from(companies).orderBy(companies.name);
  }

  async getCompany(id: string): Promise<Company | undefined> {
    const [company] = await db.select().from(companies).where(eq(companies.id, id));
    return company;
  }

  async createCompany(company: InsertCompany): Promise<Company> {
    const [created] = await db.insert(companies).values(company).returning();
    return created;
  }

  async listPlacementDrives(filters?: { companyId?: string; status?: string }): Promise<PlacementDrive[]> {
    let query = db.select().from(placementDrives);
    const conditions = [];

    if (filters?.companyId) {
      conditions.push(eq(placementDrives.companyId, filters.companyId));
    }
    if (filters?.status && filters.status !== "All") {
      conditions.push(eq(placementDrives.status, filters.status));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    return await query.orderBy(desc(placementDrives.driveDate));
  }

  async getPlacementDrive(id: string): Promise<PlacementDrive | undefined> {
    const [drive] = await db.select().from(placementDrives).where(eq(placementDrives.id, id));
    return drive;
  }

  async createPlacementDrive(drive: InsertDrive): Promise<PlacementDrive> {
    const [created] = await db.insert(placementDrives).values(drive).returning();
    return created;
  }

  async updatePlacementDrive(id: string, drive: UpdateDrive): Promise<PlacementDrive | undefined> {
    const [updated] = await db
      .update(placementDrives)
      .set(drive)
      .where(eq(placementDrives.id, id))
      .returning();
    return updated;
  }

  async deletePlacementDrive(id: string): Promise<boolean> {
    const result = await db.delete(placementDrives).where(eq(placementDrives.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  async createAuditLog(log: InsertAuditLog): Promise<AuditLog> {
    const [created] = await db.insert(auditLogs).values(log).returning();
    return created;
  }

  async listAuditLogs(driveId: string): Promise<AuditLog[]> {
    return await db.select().from(auditLogs).where(eq(auditLogs.driveId, driveId)).orderBy(desc(auditLogs.createdAt));
  }
}

export const storage = new DatabaseStorage();
