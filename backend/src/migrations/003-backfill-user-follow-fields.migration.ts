import { db } from "../config/firebase";
import { usersService } from "../services/users.service";
import { Migration } from "./migration.types";

export const backfillUserFollowFieldsMigration: Migration = {
  id: "003-backfill-user-follow-fields",
  description:
    "Populates following/followers/rating on existing users so the new company-account follow feature can read them safely",
  async run() {
    const users = await usersService.listUsers();
    const usersRef = db.collection("users");

    let updated = 0;
    for (const user of users) {
      if (user.following !== undefined && user.followers !== undefined && user.rating !== undefined) {
        continue;
      }

      await usersRef.doc(user.id).update({
        following: user.following ?? [],
        followers: user.followers ?? [],
        rating: user.rating ?? { average: 0, count: 0 },
      });
      updated += 1;
    }

    console.log(`  Backfilled following/followers/rating for ${updated} user(s)`);
  },
};
