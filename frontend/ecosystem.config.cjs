const productionEnv = {
  NODE_ENV: "production",
  PORT: 3000,
  HOSTNAME: "0.0.0.0",
  APP_URL: "https://youngoing.cn",
  BACKEND_URL: "http://127.0.0.1:4001",
};

module.exports = {
  apps: [
    {
      name: "bookmark-nav-frontend",
      script: "./frontend/server.js",
      cwd: __dirname,
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
