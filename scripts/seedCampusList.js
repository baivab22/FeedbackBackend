const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const { connectDB } = require('../config/db');
const CampusList = require('../models/CampusList');

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

function toSafeString(value) {
  if (value === undefined || value === null) return '';
  return String(value).trim();
}

async function seedCampusList() {
  const dataPath = path.resolve(__dirname, '../data/campusList.json');
  const dryRun = process.argv.includes('--dry-run');

  if (!fs.existsSync(dataPath)) {
    throw new Error(`campusList.json not found at ${dataPath}`);
  }

  const raw = fs.readFileSync(dataPath, 'utf-8');
  const records = JSON.parse(raw);

  if (!Array.isArray(records)) {
    throw new Error('campusList.json does not contain an array');
  }

  const documents = records
    .filter((row) => row && row.campusname && row.District)
    .map((row, index) => {
      const SN = Number.isFinite(Number(row.SN)) && Number(row.SN) > 0 ? Number(row.SN) : index + 1;
      const document = {
        SN,
        campusname: toSafeString(row.campusname),
        localAddress: toSafeString(row.localAddress),
        District: toSafeString(row.District),
        fullAddress: toSafeString(row.fullAddress),
        principlename: toSafeString(row.principlename),
        contactNumber: toSafeString(row.contactNumber),
        emailAddress: toSafeString(row.emailAddress),
        location: toSafeString(row.location),
        collegeType: toSafeString(row.collegeType || row.campusType),
      };

      if (mongoose.isValidObjectId(row._id)) {
        document._id = row._id;
      }

      return document;
    });

  if (documents.length === 0) {
    console.log('No valid rows found in campusList.json');
    return;
  }

  const duplicateSNs = documents
    .map((document) => document.SN)
    .filter((SN, index, allSNs) => allSNs.indexOf(SN) !== index);

  if (duplicateSNs.length > 0) {
    throw new Error(`Duplicate SN values found: ${[...new Set(duplicateSNs)].join(', ')}`);
  }

  documents.forEach((document) => {
    const validationError = new CampusList(document).validateSync();
    if (validationError) {
      throw new Error(`Invalid campus row SN ${document.SN}: ${validationError.message}`);
    }
  });

  if (dryRun) {
    console.log('Campus list seed dry run completed');
    console.log(`Rows ready to replace: ${documents.length}`);
    return;
  }

  const deleteResult = await CampusList.deleteMany({});
  const inserted = await CampusList.insertMany(documents, { ordered: false });

  console.log('Campus list replacement completed');
  console.log(`Deleted existing rows: ${deleteResult.deletedCount || 0}`);
  console.log(`Inserted latest rows: ${inserted.length}`);
}

(async () => {
  try {
    const dryRun = process.argv.includes('--dry-run');
    if (dryRun) {
      await seedCampusList();
      process.exit(0);
    }

    await connectDB(process.env.MONGODB_URI);
    await seedCampusList();
    process.exit(0);
  } catch (error) {
    console.error('Failed to seed campus list:', error.message);
    process.exit(1);
  }
})();
