// Manual entry point to sync the badge catalog and run pending migrations
// without starting the server. Useful for CI/CD deploy steps or local debugging.
// Run with: npm run migrate
import { runMigrations } from "../migrations/migration-runner";
import { allMigrations } from "../migrations";
import { buildBadgeCatalog } from "../config/badge-catalog";
import { badgesCatalogService } from "../services/badges-catalog.service";

async function main(): Promise<void> {
  const catalog = await buildBadgeCatalog();
  await badgesCatalogService.syncCatalog(catalog);
  await runMigrations(allMigrations);
}

main()
  .then(() => {
    console.log("Badge catalog synced and migrations up to date.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Error running migrate script:", error);
    process.exit(1);
  });
