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

const environment = z.object({
  PORT: z.coerce.number().int().positive().default(4000),
  MONGODB_URI: z.string().min(1),
  MONGODB_DB: z.string().min(1).default("bookmark_nav"),
  MONGODB_APP_NAME: z.string().min(1).default("bookmark-nav"),
  MONGODB_SERVER_SELECTION_TIMEOUT_MS: z.coerce.number().int().positive().default(5000),
  AUTH_SECRET: z.string().min(16).default("bookmark-nav-development-secret-change-me"),
  API_TOKEN: z.string().min(1).default("demo-api-token"),
  GOOGLE_CLIENT_ID: z.string().default(""),
  GOOGLE_CLIENT_SECRET: z.string().default(""),
  GOOGLE_REDIRECT_URI: z.string().url().default("http://localhost:3000/auth/google/callback"),
});

const parsed = environment.safeParse(process.env);
if (!parsed.success) throw new Error(`Invalid backend environment: ${parsed.error.message}`);

export const config = parsed.data;
export const configSource = envPath || "process environment and defaults";
