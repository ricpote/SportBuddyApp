import { Timestamp } from "firebase-admin/firestore";
import { db } from "../config/firebase";
import {
  Activity,
  ActivityStatus,
  CreateActivityDto,
  createActivityObject,
  SkillLevel,
} from "../models/activity.model";
import { isWithinRadiusKm, isValidCoordinates } from "../util/geo.util";
import { usersService } from "./users.service";
import { sportsService } from "./sports.service";

const ACTIVITIES_COLLECTION = "activities";

function toDate(value: unknown): Date {
  return value instanceof Timestamp ? value.toDate() : (value as Date);
}

export type UpdateActivityDto = {
  title?: string;
  description?: string;
  date?: Date;
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

    const activity = normalizeActivity(doc.data()!);

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

    let activities = snapshot.docs.map((doc) => normalizeActivity(doc.data()));

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
    let query: FirebaseFirestore.Query = this.activitiesRef
      .where("participantsList", "array-contains", userId)
      .orderBy("date", "asc");

    if (filters.sportId) {
      query = query.where("sportId", "==", filters.sportId);
    }

    if (filters.status) {
      query = query.where("status", "==", filters.status);
    }

    if (filters.date) {
      const start = new Date(filters.date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(filters.date);
      end.setHours(23, 59, 59, 999);
      query = query.where("date", ">=", start).where("date", "<=", end);
    }

    const snapshot = await query.get();

    return snapshot.docs.map(doc => normalizeActivity(doc.data()));
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
    const changes = JSON.parse(JSON.stringify({ ...data, updatedAt: now }));

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

  async removeParticipant(activityId: string, requesterId: string, participantId: string): Promise<Activity> {
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

    let updatedParticipants = activity.participantsList.filter(id => id !== participantId);
    let updatedWaitlist = [...activity.waitlist];
    const now = new Date();
    let promoted: string | undefined;

    if (!activity.requiresApproval && updatedWaitlist.length > 0) {
      promoted = updatedWaitlist.shift()!;
      updatedParticipants = [...updatedParticipants, promoted];
    }

    const isFull = updatedParticipants.length >= activity.maxParticipants;
    const newStatus: ActivityStatus = isFull ? "full" : "open";

    await this.activitiesRef.doc(activityId).update({
      participantsList: updatedParticipants,
      waitlist: updatedWaitlist,
      status: newStatus,
      updatedAt: now,
    });

    await usersService.incrementStat(participantId, "activitiesJoined", -1);
    if (promoted) {
      await usersService.incrementStat(promoted, "activitiesJoined", 1);
    }

    return { ...activity, participantsList: updatedParticipants, waitlist: updatedWaitlist, status: newStatus, updatedAt: now };
  }

  async joinActivity(activityId: string, userId: string): Promise<Activity> {
    const activity = await this.getActivityById(activityId);

    if (!activity) {
      throw new Error("Activity not found");
    }

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

      await this.activitiesRef.doc(activityId).update({
        waitlist: updatedWaitlist,
        updatedAt: now,
      });

      return { ...activity, waitlist: updatedWaitlist, updatedAt: now };
    }

    const updatedParticipants = [...activity.participantsList, userId];
    const isFull = updatedParticipants.length == activity.maxParticipants;
    const newStatus: ActivityStatus = isFull ? "full" : "open";

    await this.activitiesRef.doc(activityId).update({
      participantsList: updatedParticipants,
      status: newStatus,
      updatedAt: now,
    });
    await usersService.incrementStat(userId, "activitiesJoined", 1);

    return { ...activity, participantsList: updatedParticipants, status: newStatus, updatedAt: now };
  }

  async leaveActivity(activityId: string, userId: string): Promise<Activity> {
    const activity = await this.getActivityById(activityId);

    if (!activity) {
      throw new Error("Activity not found");
    }

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

      await this.activitiesRef.doc(activityId).update({
        waitlist: updatedWaitlist,
        updatedAt: now,
      });

      return { ...activity, waitlist: updatedWaitlist, updatedAt: now };
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

    await this.activitiesRef.doc(activityId).update({
      participantsList: updatedParticipants,
      waitlist: updatedWaitlist,
      status: newStatus,
      updatedAt: now,
    });

    await usersService.incrementStat(userId, "activitiesJoined", -1);
    if (promoted) {
      await usersService.incrementStat(promoted, "activitiesJoined", 1);
    }

    return { ...activity, participantsList: updatedParticipants, waitlist: updatedWaitlist, status: newStatus, updatedAt: now };
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

    await this.activitiesRef.doc(activityId).update({
      participantsList: updatedParticipants, waitlist: updatedWaitlist,
      status: newStatus, updatedAt: now,
    });
    await usersService.incrementStat(userId, "activitiesJoined", 1);

    return {
      ...activity, participantsList: updatedParticipants, waitlist: updatedWaitlist, status: newStatus,
      updatedAt: now,
    };
  }
}

export const activitiesService = new ActivitiesService();
