export type UserRole = "participant" | "activity_manager" | "partner" | "admin";

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
  fairPlayVotesReceived: number;
  badges: string[];
};

export type User = {
  id: string;
  firebaseUid: string;

  name: string;
  email: string;
  bio?: string;
  avatarUrl?: string;

  role: UserRole;
  status: UserStatus;

  sports: UserSportProfile[];

  location?: UserLocation;

  stats: UserStats;

  createdAt: Date;
  updatedAt: Date;
};

export type PublicUser = Omit<User, "email" | "firebaseUid">;

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

    role: "participant",
    status: "active",

    sports: data.sports ?? [],

    location: data.location,

    stats: {
      activitiesJoined: 0,
      activitiesCreated: 0,
      mvpVotesReceived: 0,
      fairPlayVotesReceived: 0,
      badges: [],
    },

    createdAt: now,
    updatedAt: now,
  };
}