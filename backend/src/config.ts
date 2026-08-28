import dotenv from "dotenv";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { z } from "zod";

const envPath = [
  resolve(process.cwd(), ".env"),
  resolve(process.cwd(), "backend/.env"),
  resolve(process.cwd(), "../backend/.env"),
].find(existsSync);
if (envPath) dotenv.config({ path: envPath });

const developmentAuthSecret = "bookmark-nav-development-secret-change-me";
const environment = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  MONGODB_URI: z.string().min(1),
  MONGODB_DB: z.string().min(1).default("bookmark_nav"),
  MONGODB_APP_NAME: z.string().min(1).default("bookmark-nav"),
  MONGODB_SERVER_SELECTION_TIMEOUT_MS: z.coerce
    .number()
    .int()
    .positive()
    .default(5000),
  BETTER_AUTH_SECRET: z.string().min(32).default(developmentAuthSecret),
  BETTER_AUTH_URL: z.string().url().default("http://localhost:3000"),
  GOOGLE_CLIENT_ID: z.string().default(""),
  GOOGLE_CLIENT_SECRET: z.string().default(""),
  GOOGLE_PROXY_URL: z.string().url().optional(),
  FEISHU_LOGIN_ENABLED: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
  FEISHU_CLIENT_ID: z.string().default(""),
  FEISHU_CLIENT_SECRET: z.string().default(""),
});

const parsed = environment.safeParse(process.env);
if (!parsed.success)
  throw new Error(`Invalid backend environment: ${parsed.error.message}`);
if (
  parsed.data.NODE_ENV === "production" &&
  parsed.data.BETTER_AUTH_SECRET === developmentAuthSecret
)
  throw new Error(
    "BETTER_AUTH_SECRET must be configured with at least 32 random characters in production",
  );
if (
  parsed.data.FEISHU_LOGIN_ENABLED &&
  (!parsed.data.FEISHU_CLIENT_ID || !parsed.data.FEISHU_CLIENT_SECRET)
)
  throw new Error(
    "FEISHU_CLIENT_ID and FEISHU_CLIENT_SECRET are required when FEISHU_LOGIN_ENABLED=true",
  );

export const config = parsed.data;
export const configSource = envPath || "process environment and defaults";
