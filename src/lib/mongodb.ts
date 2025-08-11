import { MongoClient, Db } from 'mongodb';

const uri = process.env.MONGODB_URI as string;
if (!uri) {
  throw new Error('MONGODB_URI is not set. Add it to your environment.');
}

const dbName = process.env.MONGODB_DB || 'emailtoreport';

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

let clientPromise: Promise<MongoClient>;

if (!global._mongoClientPromise) {
  const client = new MongoClient(uri);
  global._mongoClientPromise = client.connect();
}

clientPromise = global._mongoClientPromise;

// Track if indexes have been created to avoid redundant operations
let indexesCreated = false;

export async function getDb(): Promise<Db> {
  const client = await clientPromise;
  const db = client.db(dbName);
  
  // Create indexes only once per process lifecycle (not per request)
  if (!indexesCreated) {
    await Promise.all([
      // Existing indexes
      db.collection('emails').createIndex({ messageId: 1 }, { unique: true }),
      db.collection('outages').createIndex({ start: 1 }),
      db.collection('outages').createIndex({ year: 1, month: 1, day: 1 }),
      
      // Performance optimization: Compound indexes for common query patterns
      db.collection('outages').createIndex({ start: 1, end: 1 }, { background: true }),
      db.collection('outages').createIndex({ start: 1, durationMinutes: 1 }, { background: true }),
      db.collection('emails').createIndex({ date: 1, type: 1 }, { background: true }),
      
      // Sparse index for optional fields to improve query performance
      db.collection('outages').createIndex({ end: 1 }, { sparse: true, background: true })
    ]).catch(() => undefined);
    indexesCreated = true;
  }
  
  return db;
}

export async function getClient(): Promise<MongoClient> {
  return clientPromise;
}