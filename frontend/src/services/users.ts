import { api } from '@/services/api';
import { AdminUser, PublicUser, UserProfile,UserRole  } from '@/types/user';

export function getMyProfile(): Promise<UserProfile> {
  return api.get<UserProfile>('/api/users/me');
}

export function getUserProfile(userId: string): Promise<PublicUser> {
  return api.get<PublicUser>(`/api/users/${userId}`);
}

export function updateMyProfile(data: { name?: string; bio?: string }): Promise<UserProfile> {
  return api.patch<UserProfile>('/api/users/me', data);
}

export function uploadMyAvatar(imageData: string): Promise<UserProfile> {
  return api.post<UserProfile>('/api/users/me/avatar', { imageData });
}

export function listAdminUsers(): Promise<AdminUser[]> {
  return api.get<AdminUser[]>('/api/users');
}

export function banUser(userId: string): Promise<AdminUser> {
  return api.patch<AdminUser>(`/api/users/${userId}/ban`);
}

export function reactivateUser(userId: string): Promise<AdminUser> {
  return api.patch<AdminUser>(`/api/users/${userId}/reactivate`);
}

export function deleteUser(userId: string): Promise<{ message: string }> {
  return api.delete<{ message: string }>(`/api/users/${userId}`);
}

export function updateUserRole(userId: string, role: string): Promise<AdminUser> {
  return api.patch<AdminUser>(`/api/users/${userId}/role`, { role });
}
