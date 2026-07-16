export type UserRole = "participant" | "partner" | "admin";

export type SkillLevel = "beginner" | "intermediate" | "advanced" | "competitive";

export type UserStatus = "active" | "banned" | "deleted";

export type UserSportProfile = {
  sportId: string;
  skillLevel: SkillLevel;
  preferredPositions: string[];
};

export type UserLocation = {
  lat: number;
  lng: number;
};

export type UserStats = {
  activitiesJoined: number;
  activitiesCreated: number;
  mvpVotesReceived: number;
  badges: string[];
  badgesUnlockedAt?: Record<string, string>;
  bySport?: Record<string, { joined: number }>;
};

export type User = {
  id: string;
  firebaseUid: string;

  name: string;
  email: string;
  nameLower: string;
  emailLower: string;
  bio?: string;
  avatarUrl?: string;

  role: UserRole;
  status: UserStatus;
  // Só usado quando status é "banned" por uma suspensão temporária; a conta
  // reativa-se sozinha (ver auth.middleware.ts) quando este prazo passa.
  bannedUntil?: Date | null;

  sports: UserSportProfile[];

  location?: UserLocation;

  stats: UserStats;

  friends: string[];
  displayedBadge?: string;

  createdAt: Date;
  updatedAt: Date;
};

export type PublicUser = Omit<User, "email" | "firebaseUid" | "nameLower" | "emailLower">;

export type CreateUserDto = {
  name: string;
  email: string;
  sports?: UserSportProfile[];
  location?: UserLocation;
};

export type UpdateUserDto = {
  name?: string;
  bio?: string;
  avatarUrl?: string;
  sports?: UserSportProfile[];
  location?: UserLocation;
};

export type ListUsersFilters = {
  role?: UserRole;
  status?: UserStatus;
};

export function createUserObject(
  id: string,
  firebaseUid: string,
  data: CreateUserDto
): User {
  const now = new Date();

  return {
    id,
    firebaseUid,

    name: data.name,
    email: data.email,
    nameLower: data.name.toLowerCase(),
    emailLower: data.email.toLowerCase(),

    role: "participant",
    status: "active",

    sports: data.sports ?? [],

    location: data.location,

    stats: {
      activitiesJoined: 0,
      activitiesCreated: 0,
      mvpVotesReceived: 0,
      badges: [],
    },

    friends: [],

    createdAt: now,
    updatedAt: now,
  };
}