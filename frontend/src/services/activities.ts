import { api } from '@/services/api';
import { Activity, CreateActivityInput, SkillLevel } from '@/types/activity';

export type UpdateActivityInput = {
  title?: string;
  description?: string;
  maxParticipants?: number;
  date?: string;
  difficultyLevel?: SkillLevel;
  requiresApproval?: boolean;
};

export function listActivities(): Promise<Activity[]> {
  return api.get<Activity[]>('/api/activities');
}

export function getActivity(activityId: string): Promise<Activity> {
  return api.get<Activity>(`/api/activities/${activityId}`);
}

export function createActivity(data: CreateActivityInput): Promise<Activity> {
  return api.post<Activity>('/api/activities', data);
}

export function updateActivity(activityId: string, data: UpdateActivityInput): Promise<Activity> {
  return api.patch<Activity>(`/api/activities/${activityId}`, data);
}

export function joinActivity(activityId: string): Promise<Activity> {
  return api.post<Activity>(`/api/activities/${activityId}/join`);
}

export function leaveActivity(activityId: string): Promise<Activity> {
  return api.post<Activity>(`/api/activities/${activityId}/leave`);
}

export function cancelActivity(activityId: string): Promise<Activity> {
  return api.patch<Activity>(`/api/activities/${activityId}/cancel`);
}

export function removeParticipant(activityId: string, participantId: string): Promise<Activity> {
  return api.patch<Activity>(`/api/activities/${activityId}/remove-participant`, { participantId });
}

export function admitFromWaitlist(activityId: string, userId: string): Promise<Activity> {
  return api.patch<Activity>(`/api/activities/${activityId}/admit-from-waitlist`, { userId });
}
