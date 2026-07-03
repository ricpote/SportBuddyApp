export type UserRole = 'participant' | 'activity_manager' | 'partner' | 'admin';
export type UserStatus = 'active' | 'banned' | 'deleted';

export type UserStats = {
  activitiesJoined: number;
  activitiesCreated: number;
  mvpVotesReceived: number;
  fairPlayVotesReceived: number;
  badges: string[];
};

export type UserProfile = {
  id: string;
  name: string;
  email?: string;
  role: UserRole;
  status: UserStatus;
  bio?: string;
  avatarUrl?: string;
  stats: UserStats;
};

export type PublicUser = Omit<UserProfile, 'email'>;
export type AdminUser = UserProfile & { firebaseUid?: string };
