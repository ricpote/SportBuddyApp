// src/server.ts

import dotenv from "dotenv";
dotenv.config({ path: "../.env" });
import app from "./app";
import { startActivityReminderJob } from "./jobs/activityReminder.job";

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`SportBuddy API running on port ${PORT}`);
  startActivityReminderJob();
});