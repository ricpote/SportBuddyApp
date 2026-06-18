export type UserRole = 'participant' | 'activity_manager' | 'partner' | 'admin';

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
  email: string;
  role: UserRole;
  bio?: string;
  avatarUrl?: string;
  stats: UserStats;
};

export type PublicUser = Omit<UserProfile, 'email'>;
