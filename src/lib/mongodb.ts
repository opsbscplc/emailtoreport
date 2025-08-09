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

export async function getDb(): Promise<Db> {
  const client = await clientPromise;
  const db = client.db(dbName);
  // Ensure indexes once per cold start
  await Promise.all([
    db.collection('emails').createIndex({ messageId: 1 }, { unique: true }),
    db.collection('outages').createIndex({ start: 1 }),
    db.collection('outages').createIndex({ year: 1, month: 1, day: 1 }),
  ]).catch(() => undefined);
  return db;
}

export async function getClient(): Promise<MongoClient> {
  return clientPromise;
}


