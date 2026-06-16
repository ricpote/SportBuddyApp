export type SkillLevel = 'beginner' | 'intermediate' | 'advanced' | 'competitive';

export type ActivityStatus = 'open' | 'full' | 'cancelled' | 'completed';

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

  date: string;

  difficultyLevel: SkillLevel;

  requiresApproval: boolean;

  status: ActivityStatus;

  createdAt: string;
  updatedAt: string;
};

export type CreateActivityInput = {
  title: string;
  description: string;
  sportId: string;
  maxParticipants: number;
  location: ActivityLocation;
  date: string;
  difficultyLevel: SkillLevel;
  requiresApproval: boolean;
};
