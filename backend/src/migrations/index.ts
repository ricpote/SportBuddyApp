import { Migration } from "./migration.types";
import { backfillBadgesMigration } from "./001-backfill-badges-for-existing-users.migration";
import { backfillUserNameEmailLowerMigration } from "./002-backfill-user-name-email-lower.migration";


export const allMigrations: Migration[] = [
  backfillBadgesMigration,
  backfillUserNameEmailLowerMigration,
];
