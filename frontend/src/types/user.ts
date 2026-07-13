export type UserRole = 'participant' | 'activity_manager' | 'partner' | 'admin';
export type UserStatus = 'active' | 'banned' | 'deleted';

export type UserStats = {
  activitiesJoined: number;
  activitiesCreated: number;
  mvpVotesReceived: number;
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
  sports?: string[];
  location?: string | { name?: string };
  createdAt?: string;
  stats: UserStats;
};

// Perfil público de outro utilizador. Não inclui email, localização nem a
// lista de amigos; o backend devolve apenas isFriend (se EU sou amigo dele).
export type PublicUser = Omit<UserProfile, 'email'> & { isFriend?: boolean; friendCount?: number; hasSentRequest?: boolean; incomingRequestId?: string | null };
export type AdminUser = UserProfile & { firebaseUid?: string };
