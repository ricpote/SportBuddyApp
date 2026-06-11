import { api } from '@/services/api';
import { Activity, CreateActivityInput } from '@/types/activity';

export function listActivities(): Promise<Activity[]> {
  return api.get<Activity[]>('/api/activities');
}

export function getActivity(activityId: string): Promise<Activity> {
  return api.get<Activity>(`/api/activities/${activityId}`);
}

export function createActivity(data: CreateActivityInput): Promise<Activity> {
  return api.post<Activity>('/api/activities', data);
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
