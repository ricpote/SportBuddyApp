import { Migration } from "./migration.types";
import { backfillBadgesMigration } from "./001-backfill-badges-for-existing-users.migration";
import { backfillUserNameEmailLowerMigration } from "./002-backfill-user-name-email-lower.migration";
import { backfillUserFollowFieldsMigration } from "./003-backfill-user-follow-fields.migration";
import { backfillActivityRatingsMigration } from "./004-backfill-activity-ratings.migration";


export const allMigrations: Migration[] = [
  backfillBadgesMigration,
  backfillUserNameEmailLowerMigration,
  backfillUserFollowFieldsMigration,
  backfillActivityRatingsMigration,
];
