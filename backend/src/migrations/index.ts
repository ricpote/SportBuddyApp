import { Migration } from "./migration.types";
import { backfillBadgesMigration } from "./001-backfill-badges-for-existing-users.migration";

// Add new one-off data migrations here, in order. Each one runs exactly
// once, ever. The badge *catalog* itself (which badges exist) is no longer
// managed here — see `config/badge-catalog.ts` and `syncBadgeCatalog`, which
// reconcile Firestore with the code on every startup instead.
export const allMigrations: Migration[] = [backfillBadgesMigration];
