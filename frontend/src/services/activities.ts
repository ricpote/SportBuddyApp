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

export function getMyActivities(): Promise<Activity[]> {
  return api.get<Activity[]>('/api/activities/me');
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

export function rejectFromWaitlist(activityId: string, userId: string): Promise<Activity> {
  return api.patch<Activity>(`/api/activities/${activityId}/reject-from-waitlist`, { userId });
}
export type NearbyActivitiesFilters = {
  lat: number;
  lng: number;
  radiusKm: number;
  sportId?: string;
  difficultyLevel?: SkillLevel;
};

export function listNearbyActivities(filters: NearbyActivitiesFilters): Promise<Activity[]> {
  const params = new URLSearchParams({
    lat: String(filters.lat),
    lng: String(filters.lng),
    radiusKm: String(filters.radiusKm),
  });

  if (filters.sportId) {
    params.set('sportId', filters.sportId);
  }

  if (filters.difficultyLevel) {
    params.set('difficultyLevel', filters.difficultyLevel);
  }

  return api.get<Activity[]>(`/api/activities?${params.toString()}`);
}