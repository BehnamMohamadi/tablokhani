import { MongoClient } from "mongodb";
import { config } from "../shared/config.ts";
export const client = new MongoClient(config.MONGODB_URI, {
  serverSelectionTimeoutMS: 4000,
});
export async function connect() {
  await client.connect();
  const db = client.db(config.MONGODB_DATABASE);
  await Promise.all([
    db
      .collection("raw_payloads")
      .createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    db
      .collection("market_snapshots")
      .createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    db.collection("market_snapshots").createIndex({ instrumentId: 1, at: 1 }),
    db.collection("ingestion_batches").createIndex({ status: 1, at: 1 }),
    db
      .collection("intraday_bars")
      .createIndex({ instrumentId: 1, day: 1, bucket: 1 }, { unique: true }),
    db
      .collection("daily_stats")
      .createIndex({ instrumentId: 1, day: 1 }, { unique: true }),
    db.collection("signal_events").createIndex({ at: -1, instrumentId: 1 }),
    db
      .collection("official_daily")
      .createIndex({ instrumentId: 1, day: 1 }, { unique: true }),
    db.collection("published_quotes").createIndex({ batchId: 1 }),
    db.collection("market_history").createIndex({ day: 1, at: 1 }),
    db.collection("industry_history").createIndex({ day: 1, at: 1 }),
  ]);
  return db;
}
