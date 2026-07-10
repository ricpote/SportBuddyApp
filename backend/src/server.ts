
import app from "./app";
import { startActivityReminderJob } from "./jobs/activityReminder.job";
import { runMigrations } from "./migrations/migration-runner";
import { allMigrations } from "./migrations";
import { buildBadgeCatalog } from "./config/badge-catalog";
import { badgesCatalogService } from "./services/badges-catalog.service";

const PORT = process.env.PORT || 3000;

async function bootstrap(): Promise<void> {
  try {
    const catalog = await buildBadgeCatalog();
    await badgesCatalogService.syncCatalog(catalog);
  } catch (error) {
    console.error("Error syncing badge catalog:", error);
  }

  try {
    await runMigrations(allMigrations);
  } catch (error) {
    console.error("Error running migrations:", error);
  }
}

bootstrap().finally(() => {
  app.listen(PORT, () => {
    console.log(`SportBuddy API running on port ${PORT}`);
    startActivityReminderJob();
  });
});