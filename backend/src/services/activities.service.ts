import { Timestamp } from "firebase-admin/firestore";
import { db } from "../config/firebase";
import {
  Activity,
  ActivityStatus,
  CreateActivityDto,
  createActivityObject,
} from "../models/activity.model";

const ACTIVITIES_COLLECTION = "activities";

// Firestore stores Date fields as Timestamps; convert them back when reading
// so the API returns proper dates instead of {_seconds, _nanoseconds}.
function toDate(value: unknown): Date {
  return value instanceof Timestamp ? value.toDate() : (value as Date);
}

function docToActivity(data: FirebaseFirestore.DocumentData): Activity {
  return {
    ...(data as Activity),
    date: toDate(data.date),
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  };
}

export type UpdateActivityDto = {
  title?: string;
  description?: string;
  maxParticipants?: number;
  date?: Date;
  difficultyLevel?: Activity["difficultyLevel"];
  requiresApproval?: boolean;
};

export class ActivitiesService {
  private activitiesRef = db.collection(ACTIVITIES_COLLECTION);

  async createActivity(createdBy: string, data: CreateActivityDto): Promise<Activity> {
    const docRef = this.activitiesRef.doc();
    const activity = createActivityObject(docRef.id, createdBy, data);

    await docRef.set(activity);

    return activity;
  }

  async getActivityById(activityId: string): Promise<Activity | null> {
    const doc = await this.activitiesRef.doc(activityId).get();

    if (!doc.exists) {
      return null;
    }

    return docToActivity(doc.data()!);
  }

  async listActivities(): Promise<Activity[]> {
    const snapshot = await this.activitiesRef.orderBy("date", "asc").get();

    return snapshot.docs.map((doc) => docToActivity(doc.data()));
  }

  async joinActivity(activityId: string, userId: string): Promise<Activity> {
    const docRef = this.activitiesRef.doc(activityId);

    // Transaction so two simultaneous joins can't exceed maxParticipants.
    return db.runTransaction(async (tx) => {
      const doc = await tx.get(docRef);

      if (!doc.exists) {
        throw new Error("Activity not found");
      }

      const activity = docToActivity(doc.data()!);

      if (activity.status === "cancelled" || activity.status === "completed") {
        throw new Error("This activity no longer accepts participants");
      }

      if (activity.participantsList.includes(userId)) {
        throw new Error("You are already a participant of this activity");
      }

      if (activity.waitlist.includes(userId)) {
        throw new Error("You are already in the waitlist");
      }

      const now = new Date();
      const isFull = activity.participantsList.length >= activity.maxParticipants;

      if (isFull || activity.requiresApproval) {
        const waitlist = [...activity.waitlist, userId];

        tx.update(docRef, { waitlist, updatedAt: now });

        return { ...activity, waitlist, updatedAt: now };
      }

      const participantsList = [...activity.participantsList, userId];
      const status: ActivityStatus =
        participantsList.length >= activity.maxParticipants ? "full" : "open";

      tx.update(docRef, { participantsList, status, updatedAt: now });

      return { ...activity, participantsList, status, updatedAt: now };
    });
  }

  async leaveActivity(activityId: string, userId: string): Promise<Activity> {
    const docRef = this.activitiesRef.doc(activityId);

    return db.runTransaction(async (tx) => {
      const doc = await tx.get(docRef);

      if (!doc.exists) {
        throw new Error("Activity not found");
      }

      const activity = docToActivity(doc.data()!);

      if (activity.status === "cancelled" || activity.status === "completed") {
        throw new Error("Cannot leave a cancelled or completed activity");
      }

      const now = new Date();

      if (activity.waitlist.includes(userId)) {
        const waitlist = activity.waitlist.filter((id) => id !== userId);

        tx.update(docRef, { waitlist, updatedAt: now });

        return { ...activity, waitlist, updatedAt: now };
      }

      if (!activity.participantsList.includes(userId)) {
        throw new Error("You are not a participant of this activity");
      }

      if (activity.createdBy === userId) {
        throw new Error("The creator cannot leave the activity. Cancel it instead.");
      }

      const participantsList = activity.participantsList.filter((id) => id !== userId);
      const status: ActivityStatus = "open";

      tx.update(docRef, { participantsList, status, updatedAt: now });

      return { ...activity, participantsList, status, updatedAt: now };
    });
  }

  async updateActivity(activityId: string, requesterId: string, data: UpdateActivityDto
  ): Promise<Activity> {
    const activity = await this.getActivityById(activityId);

    if (!activity) {
      throw new Error("Activity not found");
    }

    if (activity.createdBy !== requesterId) {
      throw new Error("Only the activity creator can update it");
    }

    if (activity.status === "cancelled" || activity.status === "completed") {
      throw new Error("Cannot update a cancelled or completed activity");
    }

    const now = new Date();
    const changes = { ...data, updatedAt: now };

    await this.activitiesRef.doc(activityId).update(changes);

    return { ...activity, ...changes };
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

    return { ...activity, status: "cancelled", updatedAt: now };
  }

  async removeParticipant(activityId: string, requesterId: string, participantId: string ): Promise<Activity> {
    const activity = await this.getActivityById(activityId);

    if (!activity) {
      throw new Error("Activity not found");
    }

    if (activity.createdBy !== requesterId) {
      throw new Error("Only the activity creator can remove participants");
    }

    if (activity.status === "cancelled" || activity.status === "completed") {
      throw new Error("Cannot remove participants from a cancelled or completed activity");
    }

    if (!activity.participantsList.includes(participantId)) {
      throw new Error("User is not a participant of this activity");
    }

    const updatedParticipants = activity.participantsList.filter(id => id !== participantId);
    const now = new Date();

    await this.activitiesRef.doc(activityId).update({participantsList: updatedParticipants,
      status: "open" as ActivityStatus,updatedAt: now,});

    return {...activity, participantsList: updatedParticipants, status: "open", updatedAt: now,};
  }

  async admitFromWaitlist(activityId: string, requesterId: string, userId: string): Promise<Activity> {
    const activity = await this.getActivityById(activityId);

    if (!activity) {
      throw new Error("Activity not found");
    }

    if (activity.createdBy !== requesterId) {
      throw new Error("Only the activity creator can admit participants from the waitlist");
    }

    if (activity.status !== "open") {
      throw new Error("It's not possible in this activity");
    }

    if (!activity.waitlist.includes(userId)) {
      throw new Error("User is not in the waitlist");
    }

    const updatedWaitlist = activity.waitlist.filter(id => id !== userId);
    const updatedParticipants = [...activity.participantsList, userId];
    const isFull = updatedParticipants.length == activity.maxParticipants;
    const newStatus: ActivityStatus = isFull ? "full" : "open";
    const now = new Date();

    await this.activitiesRef.doc(activityId).update({participantsList: updatedParticipants,waitlist: updatedWaitlist,
      status: newStatus,updatedAt: now,});

    return {...activity, participantsList: updatedParticipants, waitlist: updatedWaitlist, status: newStatus,
      updatedAt: now,};
  }
}

export const activitiesService = new ActivitiesService();
