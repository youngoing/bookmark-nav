module.exports = {
  apps: [
    {
      name: "bookmark-nav-backend",
      script: "./dist/server.js",
      cwd: __dirname,
      env_file: "./.env",
      env: {
        NODE_ENV: "production",
      },
      env_production: {
        NODE_ENV: "production",
      },
      instances: 1,
      exec_mode: "fork",
      max_memory_restart: "500M",
      kill_timeout: 5000,
      listen_timeout: 10000,
    },
  ],
};
