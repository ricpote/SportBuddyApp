import cron from "node-cron";
import { db } from "../config/firebase";
import { Activity, ActivityStatus } from "../models/activity.model";
import { notificationsService } from "../services/notifications.service";

const ACTIVITIES_COLLECTION = "activities";

async function checkActivities() {
  const now = new Date();

  const snapshot = await db
    .collection(ACTIVITIES_COLLECTION)
    .where("status", "in", ["open", "full"])
    .get();

  for (const doc of snapshot.docs) {
    const activity = { id: doc.id, ...doc.data() } as Activity & { date: any };
    const activityDate: Date = activity.date?.toDate ? activity.date.toDate() : new Date(activity.date);

    const msUntilActivity = activityDate.getTime() - now.getTime();
    const hoursUntilActivity = msUntilActivity / (1000 * 60 * 60);

    const isFull = activity.participantsList.length >= activity.maxParticipants;

    if (hoursUntilActivity > 23 && hoursUntilActivity <= 24 && !isFull) {
      const missing = activity.maxParticipants - activity.participantsList.length;
      const deadline = new Date(activityDate.getTime() - 3 * 60 * 60 * 1000);
      const deadlineStr = deadline.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" });

      await notificationsService.createNotificationForMany(
        activity.participantsList,
        "activity_reminder",
        `A atividade "${activity.title}" começa amanhã e ainda faltam ${missing} pessoa(s). Têm até às ${deadlineStr} para completar — caso contrário será cancelada.`,
        activity.id
      );
    }

    if (hoursUntilActivity > 0 && hoursUntilActivity <= 3 && !isFull) {
      await doc.ref.update({
        status: "cancelled" as ActivityStatus,
        updatedAt: now,
      });

      await notificationsService.createNotificationForMany(
        activity.participantsList,
        "activity_auto_cancelled",
        `A atividade "${activity.title}" foi cancelada automaticamente por não ter ficado cheia a tempo.`,
        activity.id
      );
    }
  }
}

export function startActivityReminderJob() {
  cron.schedule("0 * * * *", () => {
    checkActivities().catch(err => console.error("Error in activity reminder job:", err));
  });

  console.log("Activity reminder job started");
}
