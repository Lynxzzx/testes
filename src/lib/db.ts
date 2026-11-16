import { Resolver } from "node:dns/promises";
import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

type MongooseCache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

declare global {
  // eslint-disable-next-line no-var
  var _mongoose: MongooseCache | undefined;
}

const cached: MongooseCache = global._mongoose ?? { conn: null, promise: null };
global._mongoose = cached;

/**
 * Converte uma URI `mongodb+srv://` em `mongodb://host1:27017,host2:27017,...`
 * usando DNS público (8.8.8.8 / 1.1.1.1), evitando o erro `querySrv ECONNREFUSED`
 * causado por provedores/roteadores locais no Windows.
 */
async function resolveSrvIfNeeded(uri: string): Promise<string> {
  if (!uri.startsWith("mongodb+srv://")) return uri;

  try {
    const parsed = new URL(uri);
    const srvHost = parsed.hostname;
    const resolver = new Resolver();
    resolver.setServers(["8.8.8.8", "1.1.1.1", "8.8.4.4"]);

    const [srvRecords, txtRecords] = await Promise.all([
      resolver.resolveSrv(`_mongodb._tcp.${srvHost}`),
      resolver.resolveTxt(srvHost).catch(() => [] as string[][]),
    ]);

    if (!srvRecords.length) return uri;

    const hosts = srvRecords.map((r) => `${r.name}:${r.port}`).join(",");
    const params = new URLSearchParams(parsed.search);

    for (const entry of txtRecords) {
      const txtParams = new URLSearchParams(entry.join(""));
      for (const [k, v] of txtParams.entries()) {
        if (!params.has(k)) params.set(k, v);
      }
    }

    if (!params.has("ssl") && !params.has("tls")) params.set("ssl", "true");
    if (!params.has("retryWrites")) params.set("retryWrites", "true");
    if (!params.has("w")) params.set("w", "majority");

    const auth = parsed.username
      ? `${parsed.username}${parsed.password ? `:${parsed.password}` : ""}@`
      : "";
    const dbPath = parsed.pathname && parsed.pathname !== "/" ? parsed.pathname : "/propostaai";

    return `mongodb://${auth}${hosts}${dbPath}?${params.toString()}`;
  } catch (err) {
    console.warn("[db] Falha ao converter mongodb+srv, usando URI original:", err);
    return uri;
  }
}

export async function connectDB() {
  if (!MONGODB_URI) {
    throw new Error("MONGODB_URI não definida. Configure-a no arquivo .env.local");
  }
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = resolveSrvIfNeeded(MONGODB_URI).then((resolvedUri) =>
      mongoose.connect(resolvedUri, {
        bufferCommands: false,
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 10000,
      })
    );
  }

  try {
    cached.conn = await cached.promise;
  } catch (err) {
    cached.promise = null;
    throw err;
  }
  return cached.conn;
}
