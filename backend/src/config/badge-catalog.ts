import { sportsService } from "../services/sports.service";
import { CreateBadgeDto } from "../models/badge.model";

export type SeedBadge = { id: string } & CreateBadgeDto;

// Maps Portuguese sport names to the image key prefix used in the frontend
const SPORT_IMAGE_KEY: Record<string, string> = {
  futebol: "football",
  basquetebol: "basketball",
  ciclismo: "cycling",
  corrida: "running",
  "natação": "swimming",
  natacao: "swimming",
  padel: "paddle",
  "ténis": "tennis",
  tenis: "tennis",
  voleibol: "volleyball",
};

const PARTICIPATION_BADGES: SeedBadge[] = [
  {
    id: "joined_1",
    name: "Estreante",
    description: "Participou em 1 atividade",
    icon: "participation_bronze",
    criteriaType: "activitiesJoined",
    threshold: 1,
  },
  {
    id: "joined_10",
    name: "Regular",
    description: "Participou em 10 atividades",
    icon: "participation_silver",
    criteriaType: "activitiesJoined",
    threshold: 10,
  },
  {
    id: "joined_50",
    name: "Veterano",
    description: "Participou em 50 atividades",
    icon: "participation_gold",
    criteriaType: "activitiesJoined",
    threshold: 50,
  },
];

const MVP_BADGES: SeedBadge[] = [
  {
    id: "mvp_1",
    name: "MVP",
    description: "Foi eleito MVP 1 vez",
    icon: "mvp_bronze",
    criteriaType: "mvpVotesReceived",
    threshold: 1,
  },
  {
    id: "mvp_10",
    name: "Lenda",
    description: "Foi eleito MVP 10 vezes",
    icon: "mvp_silver",
    criteriaType: "mvpVotesReceived",
    threshold: 10,
  },
];

async function buildSportBadges(): Promise<SeedBadge[]> {
  const sports = await sportsService.listSports();

  return sports.map((sport) => {
    const imageKey = SPORT_IMAGE_KEY[sport.name.trim().toLowerCase()] ?? "participation";
    return {
      id: `sport_${sport.id}_10`,
      name: `Fã de ${sport.name}`,
      description: `Participou em 10 atividades de ${sport.name}`,
      icon: `${imageKey}_bronze`,
      criteriaType: "activitiesJoinedBySport" as const,
      threshold: 10,
      sportId: sport.id,
    };
  });
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
