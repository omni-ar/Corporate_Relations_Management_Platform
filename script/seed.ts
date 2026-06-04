import "dotenv/config";
import { db } from "../server/storage";
import { companies, placementDrives, auditLogs, users } from "../shared/schema";
import bcrypt from "bcryptjs";

async function seed() {
  console.log("🌱 Seeding database with realistic placement data...\n");

  // --- 1. Create admin user if not exists ---
  const existingUsers = await db.select().from(users);
  let adminId: string;

  if (existingUsers.length > 0) {
    adminId = existingUsers[0].id;
    console.log(`✓ Using existing user: ${existingUsers[0].username}`);
  } else {
    const hash = await bcrypt.hash("admin123", 10);
    const [admin] = await db.insert(users).values({
      username: "admin",
      passwordHash: hash,
      role: "TPO_Admin",
    }).returning();
    adminId = admin.id;
    console.log("✓ Created admin user (admin / admin123)");
  }

  // --- 2. Seed companies ---
  const companyData = [
    { name: "Amazon", industry: "IT / Software" },
    { name: "Microsoft", industry: "IT / Software" },
    { name: "Google", industry: "IT / Software" },
    { name: "Oracle", industry: "IT / Software" },
    { name: "Goldman Sachs", industry: "Finance / Banking" },
    { name: "Deloitte", industry: "Consulting" },
    { name: "Accenture", industry: "Consulting" },
    { name: "Adobe", industry: "IT / Software" },
    { name: "JPMorgan Chase", industry: "Finance / Banking" },
    { name: "Samsung R&D", industry: "Core Engineering" },
  ];

  // Clear existing data (in order due to FK constraints)
  await db.delete(auditLogs);
  await db.delete(placementDrives);
  await db.delete(companies);

  const insertedCompanies: Record<string, string> = {};
  for (const c of companyData) {
    const [inserted] = await db.insert(companies).values(c).returning();
    insertedCompanies[c.name] = inserted.id;
    console.log(`  ✓ Company: ${c.name} (${c.industry})`);
  }

  // --- 3. Seed placement drives ---
  const now = new Date();
  const daysFromNow = (d: number) => {
    const date = new Date(now.getTime() + d * 24 * 60 * 60 * 1000);
    return date.toISOString().split("T")[0];
  };
  const daysAgo = (d: number) => daysFromNow(-d);

  const driveData = [
    {
      company: "Amazon",
      driveDate: daysFromNow(3),
      driveStartTime: "09:00",
      driveEndTime: "17:00",
      driveType: "FTE",
      status: "INTERVIEW_SCHEDULED",
      minCtc: 1800000,
      maxCtc: 3200000,
      studentsEligible: 420,
      studentsAppeared: 310,
      studentsShortlisted: 48,
      studentsSelected: 0,
    },
    {
      company: "Microsoft",
      driveDate: daysFromNow(5),
      driveStartTime: "10:00",
      driveEndTime: "16:00",
      driveType: "Internship",
      status: "OA_SCHEDULED",
      minCtc: 40000,
      maxCtc: 80000,
      studentsEligible: 500,
      studentsAppeared: 380,
      studentsShortlisted: 0,
      studentsSelected: 0,
    },
    {
      company: "Oracle",
      driveDate: daysFromNow(7),
      driveStartTime: "09:30",
      driveEndTime: "14:00",
      driveType: "FTE",
      status: "PPT_SCHEDULED",
      minCtc: 1000000,
      maxCtc: 1800000,
      studentsEligible: 350,
      studentsAppeared: 0,
      studentsShortlisted: 0,
      studentsSelected: 0,
    },
    {
      company: "Adobe",
      driveDate: daysAgo(14),
      driveStartTime: "09:00",
      driveEndTime: "18:00",
      driveType: "FTE",
      status: "COMPLETED",
      minCtc: 2000000,
      maxCtc: 4000000,
      studentsEligible: 380,
      studentsAppeared: 280,
      studentsShortlisted: 42,
      studentsSelected: 12,
    },
    {
      company: "Goldman Sachs",
      driveDate: daysFromNow(2),
      driveStartTime: "10:00",
      driveEndTime: "17:00",
      driveType: "FTE",
      status: "INTERVIEW_SCHEDULED",
      minCtc: 1800000,
      maxCtc: 2800000,
      studentsEligible: 300,
      studentsAppeared: 220,
      studentsShortlisted: 35,
      studentsSelected: 0,
    },
    {
      company: "Deloitte",
      driveDate: daysFromNow(10),
      driveStartTime: "09:00",
      driveEndTime: "13:00",
      driveType: "FTE",
      status: "INTERESTED",
      minCtc: 700000,
      maxCtc: 1200000,
      studentsEligible: 600,
      studentsAppeared: 0,
      studentsShortlisted: 0,
      studentsSelected: 0,
    },
    {
      company: "Accenture",
      driveDate: daysAgo(7),
      driveStartTime: "10:00",
      driveEndTime: "15:00",
      driveType: "FTE",
      status: "COMPLETED",
      minCtc: 450000,
      maxCtc: 700000,
      studentsEligible: 800,
      studentsAppeared: 620,
      studentsShortlisted: 180,
      studentsSelected: 85,
    },
    {
      company: "Google",
      driveDate: daysFromNow(1),
      driveStartTime: "09:00",
      driveEndTime: "18:00",
      driveType: "FTE",
      status: "INTERVIEW_SCHEDULED",
      minCtc: 2500000,
      maxCtc: 4500000,
      studentsEligible: 350,
      studentsAppeared: 240,
      studentsShortlisted: 28,
      studentsSelected: 0,
    },
    {
      company: "JPMorgan Chase",
      driveDate: daysAgo(3),
      driveStartTime: "10:00",
      driveEndTime: "16:00",
      driveType: "Both",
      status: "COMPLETED",
      minCtc: 1500000,
      maxCtc: 2500000,
      studentsEligible: 400,
      studentsAppeared: 290,
      studentsShortlisted: 55,
      studentsSelected: 22,
    },
    {
      company: "Samsung R&D",
      driveDate: daysFromNow(12),
      driveStartTime: "09:00",
      driveEndTime: "14:00",
      driveType: "FTE",
      status: "CONTACTED",
      minCtc: 1200000,
      maxCtc: 2000000,
      studentsEligible: 250,
      studentsAppeared: 0,
      studentsShortlisted: 0,
      studentsSelected: 0,
    },
    {
      company: "Amazon",
      driveDate: daysAgo(30),
      driveStartTime: "09:00",
      driveEndTime: "17:00",
      driveType: "Internship",
      status: "COMPLETED",
      minCtc: 60000,
      maxCtc: 100000,
      studentsEligible: 500,
      studentsAppeared: 400,
      studentsShortlisted: 60,
      studentsSelected: 25,
    },
    {
      company: "Microsoft",
      driveDate: daysAgo(21),
      driveStartTime: "09:00",
      driveEndTime: "16:00",
      driveType: "FTE",
      status: "COMPLETED",
      minCtc: 2000000,
      maxCtc: 3500000,
      studentsEligible: 450,
      studentsAppeared: 340,
      studentsShortlisted: 50,
      studentsSelected: 18,
    },
    {
      company: "Google",
      driveDate: daysFromNow(15),
      driveStartTime: "10:00",
      driveEndTime: "17:00",
      driveType: "Internship",
      status: "INTERESTED",
      minCtc: 80000,
      maxCtc: 120000,
      studentsEligible: 300,
      studentsAppeared: 0,
      studentsShortlisted: 0,
      studentsSelected: 0,
    },
    {
      company: "Deloitte",
      driveDate: daysAgo(10),
      driveStartTime: "09:00",
      driveEndTime: "14:00",
      driveType: "Internship",
      status: "COMPLETED",
      minCtc: 30000,
      maxCtc: 50000,
      studentsEligible: 700,
      studentsAppeared: 520,
      studentsShortlisted: 120,
      studentsSelected: 45,
    },
    {
      company: "Oracle",
      driveDate: daysAgo(5),
      driveStartTime: "09:00",
      driveEndTime: "15:00",
      driveType: "FTE",
      status: "COMPLETED",
      minCtc: 1200000,
      maxCtc: 1800000,
      studentsEligible: 380,
      studentsAppeared: 260,
      studentsShortlisted: 40,
      studentsSelected: 15,
    },
    {
      company: "Goldman Sachs",
      driveDate: daysFromNow(20),
      driveStartTime: "10:00",
      driveEndTime: "17:00",
      driveType: "Internship",
      status: "CONTACTED",
      minCtc: 50000,
      maxCtc: 80000,
      studentsEligible: 250,
      studentsAppeared: 0,
      studentsShortlisted: 0,
      studentsSelected: 0,
    },
    {
      company: "Adobe",
      driveDate: daysFromNow(4),
      driveStartTime: "09:00",
      driveEndTime: "17:00",
      driveType: "Internship",
      status: "PPT_SCHEDULED",
      minCtc: 50000,
      maxCtc: 90000,
      studentsEligible: 300,
      studentsAppeared: 0,
      studentsShortlisted: 0,
      studentsSelected: 0,
    },
    {
      company: "Accenture",
      driveDate: daysFromNow(8),
      driveStartTime: "10:00",
      driveEndTime: "14:00",
      driveType: "Internship",
      status: "INTERESTED",
      minCtc: 25000,
      maxCtc: 40000,
      studentsEligible: 900,
      studentsAppeared: 0,
      studentsShortlisted: 0,
      studentsSelected: 0,
    },
  ];

  const PIPELINE = ["CONTACTED", "INTERESTED", "PPT_SCHEDULED", "OA_SCHEDULED", "INTERVIEW_SCHEDULED", "COMPLETED"];

  for (const d of driveData) {
    const companyId = insertedCompanies[d.company];
    const [drive] = await db.insert(placementDrives).values({
      companyId,
      driveDate: d.driveDate,
      driveStartTime: d.driveStartTime,
      driveEndTime: d.driveEndTime,
      driveType: d.driveType,
      status: d.status,
      minCtc: d.minCtc,
      maxCtc: d.maxCtc,
      studentsEligible: d.studentsEligible,
      studentsAppeared: d.studentsAppeared,
      studentsShortlisted: d.studentsShortlisted,
      studentsSelected: d.studentsSelected,
    }).returning();

    // Generate audit logs for status progression
    const targetIndex = PIPELINE.indexOf(d.status);
    if (targetIndex >= 0) {
      // Creation log
      await db.insert(auditLogs).values({
        userId: adminId,
        driveId: drive.id,
        action: "DRIVE_CREATED",
        newStatus: "CONTACTED",
        metadata: { driveType: d.driveType, company: d.company },
      });

      // Status transition logs
      for (let i = 0; i < targetIndex; i++) {
        await db.insert(auditLogs).values({
          userId: adminId,
          driveId: drive.id,
          action: "STATUS_CHANGE",
          previousStatus: PIPELINE[i],
          newStatus: PIPELINE[i + 1],
          metadata: { company: d.company },
        });
      }
    }

    console.log(`  ✓ Drive: ${d.company} (${d.driveType}) → ${d.status}`);
  }

  const driveCount = driveData.length;
  const logCount = await db.select().from(auditLogs);
  console.log(`\n✅ Seed complete!`);
  console.log(`   ${companyData.length} companies`);
  console.log(`   ${driveCount} placement drives`);
  console.log(`   ${logCount.length} audit log entries`);

  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
