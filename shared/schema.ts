import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// Users Table (Auth & Roles)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("Coordinator"), // Admin, Coordinator
  refreshTokenHash: text("refresh_token_hash"),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  passwordHash: true,
  role: true,
});
export type User = typeof users.$inferSelect;

// Companies Table (Normalized Entity)
export const companies = pgTable("companies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  industry: text("industry").notNull(),
});

export const insertCompanySchema = createInsertSchema(companies).omit({ id: true });
export type Company = typeof companies.$inferSelect;

// Placement Drives (The Event & State Machine)
export const placementDrives = pgTable("placement_drives", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  driveDate: text("drive_date"), // YYYY-MM-DD
  driveStartTime: text("drive_start_time"), // HH:mm (24h format)
  driveEndTime: text("drive_end_time"), // HH:mm
  driveType: text("drive_type").notNull().default("FTE"), // FTE, Internship, Both
  status: text("status").notNull().default("CONTACTED"), // CONTACTED, INTERESTED, PPT_SCHEDULED, OA_SCHEDULED, INTERVIEW_SCHEDULED, COMPLETED, CANCELLED
  minCtc: integer("min_ctc"),
  maxCtc: integer("max_ctc"),
  studentsEligible: integer("students_eligible").default(0),
  studentsAppeared: integer("students_appeared").default(0),
  studentsShortlisted: integer("students_shortlisted").default(0),
  studentsSelected: integer("students_selected").default(0),
});

export const insertDriveSchema = createInsertSchema(placementDrives).omit({ id: true });
export const updateDriveSchema = insertDriveSchema.partial();
export type PlacementDrive = typeof placementDrives.$inferSelect;

// Audit Logs Table
export const auditLogs = pgTable("audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "set null" }),
  driveId: varchar("drive_id").references(() => placementDrives.id, { onDelete: "cascade" }),
  action: text("action").notNull(), // e.g., "STATUS_UPDATE", "SCHEDULE_CHANGE"
  previousStatus: text("previous_status"),
  newStatus: text("new_status"),
  metadata: jsonb("metadata"), // flexible JSON for extra details
  createdAt: timestamp("created_at").defaultNow(),
});

export type AuditLog = typeof auditLogs.$inferSelect;
