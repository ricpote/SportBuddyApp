// Manual entry point to run pending migrations without starting the server.
// Useful for CI/CD deploy steps or local debugging.
// Run with: npm run migrate
import { runMigrations } from "../migrations/migration-runner";
import { allMigrations } from "../migrations";

runMigrations(allMigrations)
  .then(() => {
    console.log("Migrations up to date.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Error running migrations:", error);
    process.exit(1);
  });
