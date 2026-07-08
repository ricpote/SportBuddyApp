import { sportsService } from "../services/sports.service";
import { CreateBadgeDto } from "../models/badge.model";

export type SeedBadge = { id: string } & CreateBadgeDto;

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

/**
 * Single source of truth for the badge catalog. To add, change or remove a
 * badge, edit this file directly — `syncBadgeCatalog` reconciles Firestore
 * with whatever this function returns on every server startup.
 */
export async function buildBadgeCatalog(): Promise<SeedBadge[]> {
  const sportBadges = await buildSportBadges();

  return [...PARTICIPATION_BADGES, ...MVP_BADGES, ...sportBadges];
}
