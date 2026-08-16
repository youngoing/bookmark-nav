const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { parseEnv } = require("node:util");

const runtimeEnv = parseEnv(readFileSync(join(__dirname, ".env"), "utf8"));

module.exports = {
  apps: [
    {
      name: "bookmark-nav-frontend",
      script: "./frontend/server.js",
      cwd: __dirname,
      env: {
        NODE_ENV: "production",
        PORT: 3000,
        HOSTNAME: "0.0.0.0",
        BACKEND_URL: "http://127.0.0.1:4001",
        ...runtimeEnv,
      },
      env_production: {
        NODE_ENV: "production",
        PORT: 3000,
        HOSTNAME: "0.0.0.0",
        BACKEND_URL: "http://127.0.0.1:4001",
        ...runtimeEnv,
      },
      instances: 1,
      exec_mode: "fork",
      max_memory_restart: "500M",
      kill_timeout: 5000,
      listen_timeout: 10000,
    },
  ],
};
