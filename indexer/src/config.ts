import { config as loadEnv } from "dotenv";

loadEnv();

export const CONFIG = {
  contractId:
    process.env.CONTRACT_ID ??
    "CD3TE3IAHM737P236XZL2OYU275ZKD6MN7YH7PYYAXYIGEH55OPEWYJC",
  networkPassphrase:
    process.env.NETWORK_PASSPHRASE ?? "Test SDF Network ; September 2015",
  rpcUrl: process.env.RPC_URL ?? "https://soroban-testnet.stellar.org",
  dbPath: process.env.DB_PATH ?? "indexer.db",
  /** Polling interval in milliseconds (default: 5 seconds). */
  pollIntervalMs: Number(process.env.POLL_INTERVAL_MS ?? "5000"),
  /** HTTP port for the REST API. */
  apiPort: Number(process.env.PORT ?? "3001"),
  /**
   * Ledger to start indexing from on first run.
   * 0 = automatically start from (latestLedger - 1000).
   */
  startLedger: Number(process.env.START_LEDGER ?? "0"),
  /** Optional Redis connection URL (e.g. redis://localhost:6379). Caching is disabled when unset. */
  redisUrl: process.env.REDIS_URL,
  /** Rate limit window for the public API, in ms (default: 60 seconds). */
  rateLimitWindowMs: Number(process.env.RATE_LIMIT_WINDOW_MS ?? "60000"),
  /** Max requests per IP per window (default: 100). */
  rateLimitMax: Number(process.env.RATE_LIMIT_MAX ?? "100"),
  /**
   * Comma-separated list of IPs exempt from rate limiting, e.g. for
   * internal services and monitoring (e.g. "10.0.0.5,10.0.0.6").
   */
  rateLimitWhitelist: (process.env.RATE_LIMIT_WHITELIST ?? "")
    .split(",")
    .map((ip) => ip.trim())
    .filter(Boolean),
} as const;
