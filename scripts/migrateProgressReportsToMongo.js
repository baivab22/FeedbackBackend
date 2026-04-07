const fs = require('fs').promises;
const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const ProgressReport = require('../models/ProgressReport');

const DATA_FILE = path.join(__dirname, '../data/progress_reports.json');

function toDateOrNow(value) {
  const dt = value ? new Date(value) : null;
  return dt && !Number.isNaN(dt.getTime()) ? dt : new Date();
}

function normalizeReport(raw) {
  const programs = Array.isArray(raw.programs) ? raw.programs : [];
  const totalStudents = programs.reduce((sum, p) => sum + (Number(p.totalStudents) || 0), 0);

  return {
    legacyId: raw.id ? String(raw.id) : undefined,
    collegeId: raw.collegeId || 'unknown-college',
    collegeName: raw.collegeName || 'Unknown College',
    academicYear: raw.academicYear || 'Unknown Year',
    programs,
    totalStudents,
    financialStatus: raw.financialStatus || {},
    buildingStatus: raw.buildingStatus || '',
    classroomCount: Number(raw.classroomCount) || 0,
    labCount: Number(raw.labCount) || 0,
    libraryBooks: Number(raw.libraryBooks) || 0,
    actualProgress: raw.actualProgress || '',
    adminProgress: raw.adminProgress || '',
    majorChallenges: raw.majorChallenges || '',
    nextYearPlan: raw.nextYearPlan || '',
    submissionDate: toDateOrNow(raw.submissionDate || raw.createdAt),
    totalAllocatedBudget: Number(raw.totalAllocatedBudget) || 0,
    totalSpentBudget: Number(raw.totalSpentBudget) || 0,
    studentCount: Number(raw.studentCount) || 0,
    facultyDevelopment: raw.facultyDevelopment || {
      trainingAttended: 0,
      researchInvolved: 0,
    },
    createdAt: toDateOrNow(raw.createdAt),
    updatedAt: toDateOrNow(raw.updatedAt),
  };
}

async function run() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error('MONGODB_URI is missing in .env');
  }

  const fileExists = await fs
    .access(DATA_FILE)
    .then(() => true)
    .catch(() => false);

  if (!fileExists) {
    console.log('No progress_reports.json found. Nothing to migrate.');
    return;
  }

  const raw = await fs.readFile(DATA_FILE, 'utf8');
  const reports = JSON.parse(raw);

  if (!Array.isArray(reports) || reports.length === 0) {
    console.log('No records found in progress_reports.json. Nothing to migrate.');
    return;
  }

  await mongoose.connect(mongoUri, { autoIndex: true });

  let inserted = 0;
  let updated = 0;

  for (const item of reports) {
    const doc = normalizeReport(item);

    if (doc.legacyId) {
      const result = await ProgressReport.updateOne(
        { legacyId: doc.legacyId },
        { $set: doc },
        { upsert: true }
      );

      if (result.upsertedCount > 0) {
        inserted += 1;
      } else if (result.modifiedCount > 0 || result.matchedCount > 0) {
        updated += 1;
      }
    } else {
      await ProgressReport.create(doc);
      inserted += 1;
    }
  }

  console.log(`Migration complete. Inserted: ${inserted}, Updated: ${updated}`);
}

run()
  .then(async () => {
    await mongoose.disconnect();
    process.exit(0);
  })
  .catch(async (err) => {
    console.error('Migration failed:', err.message);
    try {
      await mongoose.disconnect();
    } catch (e) {
      // ignore disconnect errors
    }
    process.exit(1);
  });
