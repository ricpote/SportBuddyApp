
import app from "./app";
import { startActivityReminderJob } from "./jobs/activityReminder.job";
import { runMigrations } from "./migrations/migration-runner";
import { allMigrations } from "./migrations";

const PORT = process.env.PORT || 3000;

runMigrations(allMigrations)
  .catch((error) => {
    console.error("Error running migrations:", error);
  })
  .finally(() => {
    app.listen(PORT, () => {
      console.log(`SportBuddy API running on port ${PORT}`);
      startActivityReminderJob();
    });
  });