export type SkillLevel =
  | "beginner"
  | "intermediate"
  | "advanced"
  | "competitive";

export type ActivityStatus =
  | "open"
  | "full"
  | "cancelled"
  | "completed";

export type ActivityLocation = {
  name: string;
  lat: number;
  lng: number;
  address: string;
};

export type Activity = {
  id: string;

  title: string;
  description: string;

  sportId: string;

  createdBy: string;

  participantsList: string[];
  waitlist: string[];

  maxParticipants: number;

  location: ActivityLocation;

  date: Date;

  difficultyLevel: SkillLevel;

  requiresApproval: boolean;

  status: ActivityStatus;

  mvpVotes: Record<string, string>;
  mvpWinners: string[];
  // null enquanto a votação está aberta — tem de existir no documento
  // para a query do cron (where votingClosedAt == null) o encontrar.
  votingClosedAt?: Date | null;

  lastMessage?: string;
  lastMessageAt?: Date;
  lastMessageSender?: string;

  createdAt: Date;
  updatedAt: Date;
};

export type CreateActivityDto = {
  title: string;
  description: string;

  sportId: string;

  maxParticipants: number;

  location: ActivityLocation;

  date: Date;

  difficultyLevel: SkillLevel;

  requiresApproval: boolean;
};
export function createActivityObject(
  id: string,
  createdBy: string,
  data: CreateActivityDto
): Activity {
  const now = new Date();

  return {
    id,

    title: data.title,
    description: data.description,

    sportId: data.sportId,

    createdBy,

    participantsList: [createdBy],
    waitlist: [],

    maxParticipants: data.maxParticipants,

    location: data.location,

    date: data.date,

    difficultyLevel: data.difficultyLevel,

    requiresApproval: data.requiresApproval,

    status: data.maxParticipants <= 1 ? "full" : "open",

    mvpVotes: {},
    mvpWinners: [],
    votingClosedAt: null,

    createdAt: now,
    updatedAt: now,
  };
}
