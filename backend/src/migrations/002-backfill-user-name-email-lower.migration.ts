import { db } from "../config/firebase";
import { usersService } from "../services/users.service";
import { Migration } from "./migration.types";

export const backfillUserNameEmailLowerMigration: Migration = {
  id: "002-backfill-user-name-email-lower",
  description:
    "Populates nameLower/emailLower on existing users so uniqueness checks and search can use indexed queries instead of scanning the whole collection",
  async run() {
    const users = await usersService.listUsers();
    const usersRef = db.collection("users");

    for (const user of users) {
      const nameLower = user.name?.trim().toLowerCase() ?? "";
      const emailLower = user.email?.trim().toLowerCase() ?? "";

      await usersRef.doc(user.id).update({ nameLower, emailLower });
    }

    console.log(`  Backfilled nameLower/emailLower for ${users.length} user(s)`);
  },
};
