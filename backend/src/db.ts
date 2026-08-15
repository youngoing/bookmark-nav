import { MongoClient, type Db } from "mongodb";
import { config } from "./config";

type MongoConnectionOptions = {
  uri: string;
  database: string;
  appName: string;
};

const connectionOptions: MongoConnectionOptions = {
  uri: config.MONGODB_URI,
  database: config.MONGODB_DB,
  appName: config.MONGODB_APP_NAME,
};

let clientPromise: Promise<MongoClient> | undefined;

function getClient(): Promise<MongoClient> {
  clientPromise ??= new MongoClient(connectionOptions.uri, {
    appName: connectionOptions.appName,
    serverSelectionTimeoutMS: config.MONGODB_SERVER_SELECTION_TIMEOUT_MS,
  }).connect();
  return clientPromise;
}

export async function getDatabase(): Promise<Db> {
  const client = await getClient();
  return client.db(connectionOptions.database);
}

export async function closeDatabase(): Promise<void> {
  const client = await clientPromise;
  if (client) await client.close();
  clientPromise = undefined;
}
