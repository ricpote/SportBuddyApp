import cron from "node-cron";
import { db } from "../config/firebase";
import { Activity, ActivityStatus } from "../models/activity.model";
import { notificationsService } from "../services/notifications.service";
import { usersService } from "../services/users.service";

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

async function checkMvpVoting() {
  const now = new Date();
  const cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const snapshot = await db
    .collection("activities")
    .where("status", "==", "completed")
    .where("votingClosedAt", "==", null)
    .get();

  for (const doc of snapshot.docs) {
    const activity = { id: doc.id, ...doc.data() } as Activity & { date: any; updatedAt: any };
    const updatedAt: Date = activity.updatedAt?.toDate ? activity.updatedAt.toDate() : new Date(activity.updatedAt);

    if (updatedAt > cutoff) continue;

    const votes = activity.mvpVotes ?? {};
    const tally: Record<string, number> = {};
    for (const votedFor of Object.values(votes)) {
      tally[votedFor as string] = (tally[votedFor as string] ?? 0) + 1;
    }

    const winners: string[] = [];
    if (Object.keys(tally).length > 0) {
      const maxVotes = Math.max(...Object.values(tally));
      winners.push(...Object.keys(tally).filter(id => tally[id] === maxVotes));
    }

    await doc.ref.update({ mvpWinners: winners, votingClosedAt: now, updatedAt: now });

    for (const winnerId of winners) {
      await usersService.incrementStat(winnerId, "mvpVotesReceived", 1);
    }

    await notificationsService.createNotificationForMany(
      activity.participantsList,
      "mvp_result",
      winners.length === 1
        ? `A votação de MVP da atividade "${activity.title}" terminou!`
        : winners.length > 1
          ? `A votação de MVP da atividade "${activity.title}" terminou com empate!`
          : `A votação de MVP da atividade "${activity.title}" terminou sem votos suficientes.`,
      activity.id
    );
  }
}

export function startActivityReminderJob() {
  cron.schedule("0 * * * *", () => {
    checkActivities().catch(err => console.error("Error in activity reminder job:", err));
    checkMvpVoting().catch(err => console.error("Error in MVP voting job:", err));
  });

  console.log("Activity reminder job started");
}
