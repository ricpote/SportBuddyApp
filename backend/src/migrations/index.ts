import { Migration } from "./migration.types";
import { seedInitialBadgesMigration } from "./001-seed-initial-badges.migration";
import { backfillBadgesMigration } from "./002-backfill-badges-for-existing-users.migration";

// Add new migrations here, in order. Each one runs exactly once, ever —
// to change the badge catalog later, add a new migration file instead of
// editing an old one (e.g. "003-add-badge-for-new-sport.migration.ts").
export const allMigrations: Migration[] = [
  seedInitialBadgesMigration,
  backfillBadgesMigration,
];
