import { Timestamp } from "firebase-admin/firestore";
import { db } from "../config/firebase";
import {
  Activity,
  ActivityStatus,
  CreateActivityDto,
  createActivityObject,
  SkillLevel,
} from "../models/activity.model";
import { UserRole } from "../models/user.model";
import { isWithinRadiusKm, isValidCoordinates } from "../util/geo.util";
import { usersService } from "./users.service";
import { sportsService } from "./sports.service";
import { notificationsService } from "./notifications.service";

const ACTIVITIES_COLLECTION = "activities";
const NOTIFICATIONS_COLLECTION = "notifications";

function toDate(value: unknown): Date {
  return value instanceof Timestamp ? value.toDate() : (value as Date);
}

export type UpdateActivityDto = {
  title?: string;
  description?: string;
  date?: Date;
  maxParticipants?: number;
  difficultyLevel?: Activity["difficultyLevel"];
  requiresApproval?: boolean;
};

export type ListActivitiesFilters = {
  status?: ActivityStatus;
  sportId?: string;
  difficultyLevel?: SkillLevel;
  createdBy?: string;
  lat?: number;
  lng?: number;
  radiusKm?: number;
};

export type AdminListActivitiesFilters = {
  status?: ActivityStatus;
  createdBy?: string;
};

export type MyActivitiesFilters = {
  sportId?: string;
  status?: ActivityStatus;
  date?: Date;
};

function normalizeActivity(data: FirebaseFirestore.DocumentData): Activity {
  return {
    ...data,
    date: data.date?.toDate ? data.date.toDate() : data.date,
    createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
    updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt,
  } as Activity;
}

export class ActivitiesService {
  private activitiesRef = db.collection(ACTIVITIES_COLLECTION);

  async createActivity(createdBy: string, data: CreateActivityDto): Promise<Activity> {
    const creator = await usersService.getUserById(createdBy);

    if (!creator) {
      throw new Error("User profile not found");
    }

    if (creator.status !== "active") {
      throw new Error("Only active users can create activities");
    }

    const sport = await sportsService.getSportById(data.sportId);

    if (!sport) {
      throw new Error("Sport not found");
    }

    const docRef = this.activitiesRef.doc();
    const activity = createActivityObject(docRef.id, createdBy, data);

    await docRef.set(activity);
    await usersService.incrementStat(createdBy, "activitiesCreated", 1);

    return activity;
  }

  async getActivityById(activityId: string): Promise<Activity | null> {
    const doc = await this.activitiesRef.doc(activityId).get();

    if (!doc.exists) {
      return null;
    }

    const activity = normalizeActivity({ id: doc.id, ...doc.data()! });

    if (
      activity.status !== "completed" &&
      activity.status !== "cancelled" &&
      new Date(activity.date) < new Date()
    ) {
      const now = new Date();
      await this.activitiesRef.doc(activityId).update({
        status: "completed" as ActivityStatus,
        updatedAt: now,
      });
      return { ...activity, status: "completed", updatedAt: now };
    }

    return activity;
  }

  async listActivities(filters: ListActivitiesFilters = {}): Promise<Activity[]> {
    const statusFilter = filters.status ? [filters.status] : ["open", "full"];

    let query: FirebaseFirestore.Query = this.activitiesRef
      .where("status", "in", statusFilter)
      .where("date", ">", new Date());

    if (filters.sportId) {
      query = query.where("sportId", "==", filters.sportId);
    }

    if (filters.difficultyLevel) {
      query = query.where("difficultyLevel", "==", filters.difficultyLevel);
    }

    if (filters.createdBy) {
      query = query.where("createdBy", "==", filters.createdBy);
    }

    const snapshot = await query.get();

    let activities = snapshot.docs.map((doc) => normalizeActivity({ id: doc.id, ...doc.data() }));

    if (
      filters.lat !== undefined &&
      filters.lng !== undefined &&
      filters.radiusKm !== undefined
    ) {
      const center = {
        lat: filters.lat,
        lng: filters.lng,
      };

      if (!isValidCoordinates(center)) {
        throw new Error("Invalid coordinates");
      }

      activities = activities.filter((activity) => {
        const activityCoordinates = {
          lat: activity.location.lat,
          lng: activity.location.lng,
        };

        if (!isValidCoordinates(activityCoordinates)) {
          return false;
        }

        return isWithinRadiusKm(
          center,
          activityCoordinates,
          filters.radiusKm!
        );
      });
    }

    return activities;
  }

  async getMyActivities(userId: string, filters: MyActivitiesFilters = {}): Promise<Activity[]> {
    let participantQuery: FirebaseFirestore.Query = this.activitiesRef
      .where("participantsList", "array-contains", userId)
      .orderBy("date", "asc");

    let waitlistQuery: FirebaseFirestore.Query = this.activitiesRef
      .where("waitlist", "array-contains", userId)
      .orderBy("date", "asc");

    if (filters.sportId) {
      participantQuery = participantQuery.where("sportId", "==", filters.sportId);
      waitlistQuery = waitlistQuery.where("sportId", "==", filters.sportId);
    }

    if (filters.status) {
      participantQuery = participantQuery.where("status", "==", filters.status);
      waitlistQuery = waitlistQuery.where("status", "==", filters.status);
    }

    if (filters.date) {
      const start = new Date(filters.date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(filters.date);
      end.setHours(23, 59, 59, 999);
      participantQuery = participantQuery.where("date", ">=", start).where("date", "<=", end);
      waitlistQuery = waitlistQuery.where("date", ">=", start).where("date", "<=", end);
    }

    const [participantSnap, waitlistSnap] = await Promise.all([
      participantQuery.get(),
      waitlistQuery.get(),
    ]);

    const seen = new Set<string>();
    const activities: Activity[] = [];

    for (const doc of [...participantSnap.docs, ...waitlistSnap.docs]) {
      if (!seen.has(doc.id)) {
        seen.add(doc.id);
        activities.push(normalizeActivity({ id: doc.id, ...doc.data() }));
      }
    }

    return activities.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  async updateActivity(
    activityId: string,
    requesterId: string,
    data: UpdateActivityDto,
    requesterRole?: UserRole
  ): Promise<Activity> {
    const activity = await this.getActivityById(activityId);

    if (!activity) {
      throw new Error("Activity not found");
    }

    if (activity.createdBy !== requesterId && requesterRole !== "admin") {
      throw new Error("Only the activity creator or an admin can update it");
    }

    if (activity.status === "cancelled" || activity.status === "completed") {
      throw new Error("Cannot update a cancelled or completed activity");
    }

    const now = new Date();
    const changes: Record<string, unknown> = { updatedAt: now };
    if (data.title !== undefined) changes.title = data.title;
    if (data.description !== undefined) changes.description = data.description;
    if (data.date !== undefined) changes.date = data.date;
    if (data.difficultyLevel !== undefined) changes.difficultyLevel = data.difficultyLevel;
    if (data.requiresApproval !== undefined) changes.requiresApproval = data.requiresApproval;
    if (data.maxParticipants !== undefined) {
      if (data.maxParticipants < 2) throw new Error("maxParticipants must be at least 2");
      if (data.maxParticipants < activity.participantsList.length) throw new Error(`Cannot set maxParticipants below current participant count (${activity.participantsList.length})`);
      changes.maxParticipants = data.maxParticipants;
      const newStatus: ActivityStatus = activity.participantsList.length >= data.maxParticipants ? "full" : "open";
      if (newStatus !== activity.status) changes.status = newStatus;
    }

    await this.activitiesRef.doc(activityId).update(changes);

    return { ...activity, ...changes } as Activity;
  }

  async listAllActivities(
    filters: AdminListActivitiesFilters = {}
  ): Promise<Activity[]> {
    let query: FirebaseFirestore.Query = this.activitiesRef.orderBy(
      "date",
      "desc"
    );

    if (filters.status) {
      query = query.where("status", "==", filters.status);
    }

    if (filters.createdBy) {
      query = query.where("createdBy", "==", filters.createdBy);
    }

    const snapshot = await query.get();
    return snapshot.docs.map((doc) =>
      normalizeActivity({ id: doc.id, ...doc.data() })
    );
  }

  async deleteActivityAsAdmin(activityId: string): Promise<void> {
    const activity = await this.getActivityById(activityId);

    if (!activity) {
      throw new Error("Activity not found");
    }

    const statsUpdates: Promise<void>[] = [];

    statsUpdates.push(
      usersService.incrementStat(activity.createdBy, "activitiesCreated", -1)
    );

    for (const participantId of activity.participantsList) {
      if (participantId !== activity.createdBy) {
        statsUpdates.push(
          usersService.incrementStat(participantId, "activitiesJoined", -1)
        );
        statsUpdates.push(
          usersService.incrementSportStat(participantId, activity.sportId, -1)
        );
      }
    }

    const notificationsSnapshot = await db
      .collection(NOTIFICATIONS_COLLECTION)
      .where("activityId", "==", activityId)
      .get();

    if (!notificationsSnapshot.empty) {
      const batch = db.batch();
      notificationsSnapshot.docs.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
    }

    await Promise.all(statsUpdates);
    await db.recursiveDelete(this.activitiesRef.doc(activityId));
  }

  async cancelActivity(activityId: string, requesterId: string): Promise<Activity> {
    const activity = await this.getActivityById(activityId);

    if (!activity) {
      throw new Error("Activity not found");
    }

    if (activity.createdBy !== requesterId) {
      throw new Error("Only the activity creator can cancel it");
    }

    if (activity.status === "cancelled") {
      throw new Error("Activity is already cancelled");
    }

    if (activity.status === "completed") {
      throw new Error("Cannot cancel a completed activity");
    }

    const now = new Date();

    await this.activitiesRef.doc(activityId).update({
      status: "cancelled" as ActivityStatus,
      updatedAt: now,
    });

    const participants = activity.participantsList.filter(id => id !== requesterId);
    if (participants.length > 0) {
      await notificationsService.createNotificationForMany(
        participants,
        "activity_cancelled",
        `A atividade "${activity.title}" foi cancelada pelo criador.`,
        activityId
      );
    }

    return { ...activity, status: "cancelled", updatedAt: now };
  }

  async removeParticipant(activityId: string, requesterId: string, participantId: string): Promise<Activity> {
    const docRef = this.activitiesRef.doc(activityId);

    const result = await db.runTransaction(async (tx) => {
      const doc = await tx.get(docRef);

      if (!doc.exists) throw new Error("Activity not found");

      const activity = normalizeActivity({ id: doc.id, ...doc.data()! });

      if (activity.createdBy !== requesterId) {
        throw new Error("Only the activity creator can remove participants");
      }

      if (activity.status === "cancelled" || activity.status === "completed") {
        throw new Error("Cannot remove participants from a cancelled or completed activity");
      }

      if (participantId === activity.createdBy) {
        throw new Error("Cannot remove the activity creator");
      }

      if (!activity.participantsList.includes(participantId)) {
        throw new Error("User is not a participant of this activity");
      }

      let updatedParticipants = activity.participantsList.filter(id => id !== participantId);
      let updatedWaitlist = [...activity.waitlist];
      let promoted: string | undefined;

      if (!activity.requiresApproval && updatedWaitlist.length > 0) {
        promoted = updatedWaitlist.shift()!;
        updatedParticipants = [...updatedParticipants, promoted];
      }

      const isFull = updatedParticipants.length >= activity.maxParticipants;
      const newStatus: ActivityStatus = isFull ? "full" : "open";
      const now = new Date();

      tx.update(docRef, { participantsList: updatedParticipants, waitlist: updatedWaitlist, status: newStatus, updatedAt: now });

      return { activity, updatedParticipants, updatedWaitlist, newStatus, now, promoted };
    });

    await usersService.incrementStat(participantId, "activitiesJoined", -1);
    await usersService.incrementSportStat(participantId, result.activity.sportId, -1);
    if (result.promoted) {
      await usersService.incrementStat(result.promoted, "activitiesJoined", 1);
      await usersService.incrementSportStat(result.promoted, result.activity.sportId, 1);
    }

    await notificationsService.createNotification(
      participantId,
      "participant_removed",
      `Foste removido da atividade "${result.activity.title}" pelo criador.`,
      activityId
    );

    return { ...result.activity, participantsList: result.updatedParticipants, waitlist: result.updatedWaitlist, status: result.newStatus, updatedAt: result.now };
  }

  async joinActivity(activityId: string, userId: string): Promise<Activity> {
    const docRef = this.activitiesRef.doc(activityId);

    const result = await db.runTransaction(async (tx) => {
      const doc = await tx.get(docRef);

      if (!doc.exists) throw new Error("Activity not found");

      const activity = normalizeActivity({ id: doc.id, ...doc.data()! });

      if (activity.status === "cancelled" || activity.status === "completed") {
        throw new Error("Cannot join a cancelled or completed activity");
      }

      if (activity.participantsList.includes(userId)) {
        throw new Error("User is already a participant");
      }

      if (activity.waitlist.includes(userId)) {
        throw new Error("User is already in the waitlist");
      }

      const now = new Date();

      if (activity.requiresApproval || activity.status === "full") {
        const updatedWaitlist = [...activity.waitlist, userId];
        tx.update(docRef, { waitlist: updatedWaitlist, updatedAt: now });
        return { activity, updatedWaitlist, now, joined: false };
      }

      const updatedParticipants = [...activity.participantsList, userId];
      const isFull = updatedParticipants.length >= activity.maxParticipants;
      const newStatus: ActivityStatus = isFull ? "full" : "open";
      tx.update(docRef, { participantsList: updatedParticipants, status: newStatus, updatedAt: now });
      return { activity, updatedParticipants, newStatus, now, joined: true };
    });

    if (result.joined) {
      await usersService.incrementStat(userId, "activitiesJoined", 1);
      await usersService.incrementSportStat(userId, result.activity.sportId, 1);

      await notificationsService.createNotification(
        result.activity.createdBy,
        "activity_joined",
        `Um novo participante entrou na tua atividade "${result.activity.title}".`,
        activityId
      );

      if (result.newStatus === "full") {
        await notificationsService.createNotification(
          result.activity.createdBy,
          "activity_full",
          `A tua atividade "${result.activity.title}" ficou cheia!`,
          activityId
        );
      }

      return { ...result.activity, participantsList: result.updatedParticipants!, status: result.newStatus!, updatedAt: result.now };
    }

    await notificationsService.createNotification(
      result.activity.createdBy,
      "activity_join_request",
      `Alguém pediu para entrar na tua atividade "${result.activity.title}".`,
      activityId
    );

    return { ...result.activity, waitlist: result.updatedWaitlist!, updatedAt: result.now };
  }

  async leaveActivity(activityId: string, userId: string): Promise<Activity> {
    const docRef = this.activitiesRef.doc(activityId);

    const result = await db.runTransaction(async (tx) => {
      const doc = await tx.get(docRef);

      if (!doc.exists) throw new Error("Activity not found");

      const activity = normalizeActivity({ id: doc.id, ...doc.data()! });

      if (activity.status === "cancelled" || activity.status === "completed") {
        throw new Error("Cannot leave a cancelled or completed activity");
      }

      if (activity.createdBy === userId) {
        throw new Error("Activity creator cannot leave — cancel the activity instead");
      }

      const inWaitlist = activity.waitlist.includes(userId);
      const inParticipants = activity.participantsList.includes(userId);

      if (!inWaitlist && !inParticipants) {
        throw new Error("User is not part of this activity");
      }

      const now = new Date();

      if (inWaitlist) {
        const updatedWaitlist = activity.waitlist.filter(id => id !== userId);
        tx.update(docRef, { waitlist: updatedWaitlist, updatedAt: now });
        return { activity, updatedWaitlist, now, leftParticipants: false, promoted: undefined };
      }

      let updatedParticipants = activity.participantsList.filter(id => id !== userId);
      let updatedWaitlist = [...activity.waitlist];
      let promoted: string | undefined;

      if (!activity.requiresApproval && updatedWaitlist.length > 0) {
        promoted = updatedWaitlist.shift()!;
        updatedParticipants = [...updatedParticipants, promoted];
      }

      const isFull = updatedParticipants.length >= activity.maxParticipants;
      const newStatus: ActivityStatus = isFull ? "full" : "open";
      tx.update(docRef, { participantsList: updatedParticipants, waitlist: updatedWaitlist, status: newStatus, updatedAt: now });
      return { activity, updatedParticipants, updatedWaitlist, newStatus, now, leftParticipants: true, promoted };
    });

    if (result.leftParticipants) {
      await usersService.incrementStat(userId, "activitiesJoined", -1);
      await usersService.incrementSportStat(userId, result.activity.sportId, -1);
      if (result.promoted) {
        await usersService.incrementStat(result.promoted, "activitiesJoined", 1);
        await usersService.incrementSportStat(result.promoted, result.activity.sportId, 1);
      }

      await notificationsService.createNotification(
        result.activity.createdBy,
        "activity_left",
        `Um participante saiu da tua atividade "${result.activity.title}".`,
        activityId
      );

      return { ...result.activity, participantsList: result.updatedParticipants!, waitlist: result.updatedWaitlist!, status: result.newStatus!, updatedAt: result.now };
    }

    return { ...result.activity, waitlist: result.updatedWaitlist!, updatedAt: result.now };
  }

  async admitFromWaitlist(activityId: string, requesterId: string, userId: string): Promise<Activity> {
    const docRef = this.activitiesRef.doc(activityId);

    const result = await db.runTransaction(async (tx) => {
      const doc = await tx.get(docRef);

      if (!doc.exists) throw new Error("Activity not found");

      const activity = normalizeActivity({ id: doc.id, ...doc.data()! });

      if (activity.createdBy !== requesterId) {
        throw new Error("Only the activity creator can admit participants from the waitlist");
      }

      if (activity.status === "cancelled" || activity.status === "completed") {
        throw new Error("Cannot admit participants to a cancelled or completed activity");
      }

      if (!activity.waitlist.includes(userId)) {
        throw new Error("User is not in the waitlist");
      }

      const updatedWaitlist = activity.waitlist.filter(id => id !== userId);
      const updatedParticipants = [...activity.participantsList, userId];
      const isFull = updatedParticipants.length >= activity.maxParticipants;
      const newStatus: ActivityStatus = isFull ? "full" : "open";
      const now = new Date();

      tx.update(docRef, { participantsList: updatedParticipants, waitlist: updatedWaitlist, status: newStatus, updatedAt: now });

      return { activity, updatedParticipants, updatedWaitlist, newStatus, now };
    });

    await usersService.incrementStat(userId, "activitiesJoined", 1);
    await usersService.incrementSportStat(userId, result.activity.sportId, 1);

    await notificationsService.createNotification(
      userId,
      "waitlist_admitted",
      `O teu pedido foi aceite! Entraste na atividade "${result.activity.title}".`,
      activityId
    );

    return { ...result.activity, participantsList: result.updatedParticipants, waitlist: result.updatedWaitlist, status: result.newStatus, updatedAt: result.now };
  }

  async rejectFromWaitlist(activityId: string, requesterId: string, userId: string): Promise<Activity> {
    const docRef = this.activitiesRef.doc(activityId);

    return await db.runTransaction(async (tx) => {
      const doc = await tx.get(docRef);

      if (!doc.exists) throw new Error("Activity not found");

      const activity = normalizeActivity({ id: doc.id, ...doc.data()! });

      if (activity.createdBy !== requesterId) {
        throw new Error("Only the activity creator can reject participants from the waitlist");
      }

      if (activity.status === "cancelled" || activity.status === "completed") {
        throw new Error("Cannot reject participants from a cancelled or completed activity");
      }

      if (!activity.waitlist.includes(userId)) {
        throw new Error("User is not in the waitlist");
      }

      const updatedWaitlist = activity.waitlist.filter(id => id !== userId);
      const now = new Date();

      tx.update(docRef, { waitlist: updatedWaitlist, updatedAt: now });

      return { ...activity, waitlist: updatedWaitlist, updatedAt: now };
    });
  }
}

export const activitiesService = new ActivitiesService();
