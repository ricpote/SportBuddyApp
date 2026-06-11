import { db } from "../config/firebase";
import {
  Activity,
  ActivityStatus,
  CreateActivityDto,
  createActivityObject,
} from "../models/activity.model";

const ACTIVITIES_COLLECTION = "activities";

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

    return doc.data() as Activity;
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
