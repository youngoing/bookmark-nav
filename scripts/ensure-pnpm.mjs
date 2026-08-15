const userAgent = process.env.npm_config_user_agent || "";

if (userAgent.startsWith("npm/")) {
  console.error("This repository only supports pnpm. Run `corepack enable && pnpm install`.");
  process.exit(1);
}
