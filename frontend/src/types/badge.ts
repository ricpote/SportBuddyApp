export type BadgeCriteriaType =
  | 'activitiesJoined'
  | 'activitiesJoinedBySport'
  | 'mvpVotesReceived'
  | 'fairPlayVotesReceived';

export type Badge = {
  id: string;
  name: string;
  description: string;
  icon: string;
  criteriaType: BadgeCriteriaType;
  threshold: number;
  sportId?: string;
};

export type UserBadge = Badge & {
  unlockedAt: string;
  isDisplayed: boolean;
};
