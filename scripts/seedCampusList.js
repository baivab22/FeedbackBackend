const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { connectDB } = require('../config/db');
const CampusList = require('../models/CampusList');

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

function toSafeString(value) {
  if (value === undefined || value === null) return '';
  return String(value).trim();
}

async function seedCampusList() {
  const dataPath = path.resolve(__dirname, '../../mypr/src/data/campusList.json');

  if (!fs.existsSync(dataPath)) {
    throw new Error(`campusList.json not found at ${dataPath}`);
  }

  const raw = fs.readFileSync(dataPath, 'utf-8');
  const records = JSON.parse(raw);

  if (!Array.isArray(records)) {
    throw new Error('campusList.json does not contain an array');
  }

  const operations = records
    .filter((row) => row && row.campusname && row.District)
    .map((row, index) => {
      const SN = Number.isFinite(Number(row.SN)) && Number(row.SN) > 0 ? Number(row.SN) : index + 1;

      return {
        updateOne: {
          filter: { SN },
          update: {
            $set: {
              SN,
              campusname: toSafeString(row.campusname),
              localAddress: toSafeString(row.localAddress),
              District: toSafeString(row.District),
              fullAddress: toSafeString(row.fullAddress),
              principlename: toSafeString(row.principlename),
              contactNumber: toSafeString(row.contactNumber),
              emailAddress: toSafeString(row.emailAddress),
            },
          },
          upsert: true,
        },
      };
    });

  if (operations.length === 0) {
    console.log('No valid rows found in campusList.json');
    return;
  }

  const result = await CampusList.bulkWrite(operations, { ordered: false });

  console.log('Campus list seed completed');
  console.log(`Processed rows: ${operations.length}`);
  console.log(`Inserted: ${result.upsertedCount || 0}`);
  console.log(`Modified: ${result.modifiedCount || 0}`);
  console.log(`Matched: ${result.matchedCount || 0}`);
}

(async () => {
  try {
    await connectDB(process.env.MONGODB_URI);
    await seedCampusList();
    process.exit(0);
  } catch (error) {
    console.error('Failed to seed campus list:', error.message);
    process.exit(1);
  }
})();
