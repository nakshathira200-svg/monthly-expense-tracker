import { MongoClient, type Db } from "mongodb";

const uri = process.env.MONGO_URI;
const dbName = process.env.MONGO_DB || "monthly_expense_imports";

if (!uri) {
  throw new Error("Missing MONGO_URI in .env.local");
}

type MongoGlobal = typeof globalThis & {
  mongoClientPromise?: Promise<MongoClient>;
};

const globalForMongo = globalThis as MongoGlobal;

const clientPromise =
  globalForMongo.mongoClientPromise ??
  new MongoClient(uri).connect();

if (process.env.NODE_ENV !== "production") {
  globalForMongo.mongoClientPromise = clientPromise;
}

export async function getMongoDb(): Promise<Db> {
  const client = await clientPromise;
  return client.db(dbName);
}