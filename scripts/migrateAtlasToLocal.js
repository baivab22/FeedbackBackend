const mongoose = require('mongoose');

function parseDbNameFromUri(uri) {
  try {
    const url = new URL(uri);
    const dbName = (url.pathname || '').replace(/^\//, '');
    return dbName || null;
  } catch {
    return null;
  }
}

async function openConnection(uri, dbName, label) {
  const conn = mongoose.createConnection();
  await conn.openUri(uri, {
    dbName,
    autoIndex: false,
    serverSelectionTimeoutMS: 15000,
  });
  console.log(`Connected to ${label} (${dbName})`);
  return conn;
}

async function copyCollectionReplace(sourceDb, targetDb, collectionName) {
  const sourceCol = sourceDb.collection(collectionName);
  const targetCol = targetDb.collection(collectionName);

  const docs = await sourceCol.find({}).toArray();
  await targetCol.deleteMany({});

  if (docs.length > 0) {
    await targetCol.insertMany(docs, { ordered: false });
  }

  return { inserted: docs.length, updated: 0, deleted: 'all' };
}

async function copyCollectionMerge(sourceDb, targetDb, collectionName) {
  const sourceCol = sourceDb.collection(collectionName);
  let inserted = 0;
  let updated = 0;

  const cursor = sourceCol.find({});
  const batchSize = 500;
  let ops = [];

  const flush = async () => {
    if (ops.length === 0) {
      return;
    }

    const result = await targetDb.collection(collectionName).bulkWrite(ops, { ordered: false });
    inserted += result.upsertedCount || 0;
    updated += result.modifiedCount || 0;
    ops = [];
  };

  for await (const doc of cursor) {
    ops.push({
      replaceOne: {
        filter: { _id: doc._id },
        replacement: doc,
        upsert: true,
      },
    });

    if (ops.length >= batchSize) {
      await flush();
    }
  }

  await flush();
  return { inserted, updated, deleted: 0 };
}

async function run() {
  const sourceUri = process.env.SOURCE_MONGODB_URI || process.env.ATLAS_MONGODB_URI;
  const targetUri = process.env.TARGET_MONGODB_URI || process.env.MONGODB_URI;

  if (!sourceUri) {
    throw new Error('Missing SOURCE_MONGODB_URI (or ATLAS_MONGODB_URI).');
  }
  if (!targetUri) {
    throw new Error('Missing TARGET_MONGODB_URI (or MONGODB_URI).');
  }

  const sourceDbName =
    process.env.SOURCE_DB_NAME || parseDbNameFromUri(sourceUri) || process.env.MONGO_DB_NAME;
  const targetDbName =
    process.env.TARGET_DB_NAME || parseDbNameFromUri(targetUri) || sourceDbName;

  if (!sourceDbName || !targetDbName) {
    throw new Error('Could not resolve SOURCE_DB_NAME/TARGET_DB_NAME. Set them explicitly in env.');
  }

  const mode = (process.env.CLONE_MODE || 'merge').toLowerCase();
  if (!['merge', 'replace'].includes(mode)) {
    throw new Error("CLONE_MODE must be either 'merge' or 'replace'.");
  }

  const sourceConn = await openConnection(sourceUri, sourceDbName, 'source');
  const targetConn = await openConnection(targetUri, targetDbName, 'target');

  try {
    const sourceDb = sourceConn.db;
    const targetDb = targetConn.db;

    const collections = (await sourceDb.listCollections({}, { nameOnly: true }).toArray())
      .map((c) => c.name)
      .filter((name) => !name.startsWith('system.'));

    console.log(`Collections found in source: ${collections.length}`);

    const summary = [];

    for (const name of collections) {
      let result;
      if (mode === 'replace') {
        result = await copyCollectionReplace(sourceDb, targetDb, name);
      } else {
        result = await copyCollectionMerge(sourceDb, targetDb, name);
      }

      summary.push({ collection: name, ...result });
      console.log(
        `[${name}] inserted=${result.inserted} updated=${result.updated} deleted=${result.deleted}`
      );
    }

    console.log('Sync complete.');
    console.table(summary);
  } finally {
    await sourceConn.close();
    await targetConn.close();
  }
}

run().catch((err) => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
