import { badgesCatalogService } from "../services/badges-catalog.service";
import { sportsService } from "../services/sports.service";
import { CreateBadgeDto } from "../models/badge.model";
import { Migration } from "./migration.types";

type SeedBadge = { id: string } & CreateBadgeDto;

const PARTICIPATION_BADGES: SeedBadge[] = [
  {
    id: "joined_1",
    name: "Estreante",
    description: "Participou em 1 atividade",
    icon: "star-outline",
    criteriaType: "activitiesJoined",
    threshold: 1,
  },
  {
    id: "joined_10",
    name: "Regular",
    description: "Participou em 10 atividades",
    icon: "star-half",
    criteriaType: "activitiesJoined",
    threshold: 10,
  },
  {
    id: "joined_50",
    name: "Veterano",
    description: "Participou em 50 atividades",
    icon: "star",
    criteriaType: "activitiesJoined",
    threshold: 50,
  },
];

const MVP_BADGES: SeedBadge[] = [
  {
    id: "mvp_1",
    name: "MVP",
    description: "Foi eleito MVP 1 vez",
    icon: "trophy-outline",
    criteriaType: "mvpVotesReceived",
    threshold: 1,
  },
  {
    id: "mvp_10",
    name: "Lenda",
    description: "Foi eleito MVP 10 vezes",
    icon: "trophy",
    criteriaType: "mvpVotesReceived",
    threshold: 10,
  },
];

const FAIR_PLAY_BADGES: SeedBadge[] = [
  {
    id: "fairplay_1",
    name: "Fair Play",
    description: "Foi eleito Fair Play 1 vez",
    icon: "hand-left-outline",
    criteriaType: "fairPlayVotesReceived",
    threshold: 1,
  },
];

async function buildSportBadges(): Promise<SeedBadge[]> {
  const sports = await sportsService.listSports();

  return sports.map((sport) => ({
    id: `sport_${sport.id}_10`,
    name: `Fã de ${sport.name}`,
    description: `Participou em 10 atividades de ${sport.name}`,
    icon: "medal-outline",
    criteriaType: "activitiesJoinedBySport" as const,
    threshold: 10,
    sportId: sport.id,
  }));
}

export const seedInitialBadgesMigration: Migration = {
  id: "001-seed-initial-badges",
  description: "Creates the baseline badge catalog (participation, MVP, fair play, per-sport)",
  async run() {
    const sportBadges = await buildSportBadges();
    const allBadges = [
      ...PARTICIPATION_BADGES,
      ...MVP_BADGES,
      ...FAIR_PLAY_BADGES,
      ...sportBadges,
    ];

    for (const { id, ...data } of allBadges) {
      await badgesCatalogService.upsertBadge(id, data);
    }
  },
};
