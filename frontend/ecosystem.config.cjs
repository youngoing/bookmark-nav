const productionEnv = {
  NODE_ENV: "production",
  PORT: 3000,
  HOSTNAME: "0.0.0.0",
};

module.exports = {
  apps: [
    {
      name: "bookmark-nav-frontend",
      script: "./frontend/server.js",
      cwd: __dirname,
      // Node 22 loads the deployment's frontend/.env before starting Next.
      // Explicit environment variables supplied by PM2 still take precedence.
      node_args: "--env-file=./frontend/.env",
      env: productionEnv,
      env_production: productionEnv,
      instances: 1,
      exec_mode: "fork",
      max_memory_restart: "500M",
      kill_timeout: 5000,
      listen_timeout: 10000,
    },
  ],
};
