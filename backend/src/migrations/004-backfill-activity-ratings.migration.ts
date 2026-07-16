import { db } from "../config/firebase";
import { Migration } from "./migration.types";

const ACTIVITIES_COLLECTION = "activities";

export const backfillActivityRatingsMigration: Migration = {
  id: "004-backfill-activity-ratings",
  description:
    "Populates ratings/ratingAverage/ratingCount on existing activities so the new per-activity rating feature can read them safely",
  async run() {
    const snapshot = await db.collection(ACTIVITIES_COLLECTION).get();

    let updated = 0;
    for (const doc of snapshot.docs) {
      const data = doc.data();
      if (data.ratings !== undefined && data.ratingAverage !== undefined && data.ratingCount !== undefined) {
        continue;
      }

      await doc.ref.update({
        ratings: data.ratings ?? {},
        ratingAverage: data.ratingAverage ?? 0,
        ratingCount: data.ratingCount ?? 0,
      });
      updated += 1;
    }

    console.log(`  Backfilled ratings/ratingAverage/ratingCount for ${updated} activity(ies)`);
  },
};
