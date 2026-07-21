import { usersService } from "../services/users.service";
import { badgesService } from "../services/badges.service";
import { Migration } from "./migration.types";

export const backfillBadgesMigration: Migration = {
  id: "001-backfill-badges-for-existing-users",
  description:
    "Evaluates the badge catalog against stats users already had before the badges feature existed",
  async run() {
    const users = await usersService.listUsers();

    for (const user of users) {
      const newlyUnlocked = await badgesService.checkAndAwardBadges(user.id);

      if (newlyUnlocked.length > 0) {
        console.log(
          `  Backfilled ${newlyUnlocked.length} badge(s) for user ${user.id}: ${newlyUnlocked
            .map((b) => b.id)
            .join(", ")}`
        );
      }
    }
  },
};
