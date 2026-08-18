module.exports = {
  apps: [
    {
      name: "tribunal-electoral-app",
      script: "./dist/server.cjs",
      instances: "max",
      exec_mode: "cluster",
      env: {
        NODE_ENV: "production",
        PORT: 3000
      },
      env_production: {
        NODE_ENV: "production",
        PORT: 3000
      },
      max_memory_restart: "1G",
      error_file: "./logs/err.log",
      out_file: "./logs/out.log",
      time: true
    }
  ]
};
