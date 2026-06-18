import { api } from '@/services/api';
import { PublicUser, UserProfile } from '@/types/user';

export function getMyProfile(): Promise<UserProfile> {
  return api.get<UserProfile>('/api/users/me');
}

export function getUserProfile(userId: string): Promise<PublicUser> {
  return api.get<PublicUser>(`/api/users/${userId}`);
}
