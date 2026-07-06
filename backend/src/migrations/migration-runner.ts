import { db } from "../config/firebase";
import { Migration } from "./migration.types";

const MIGRATIONS_COLLECTION = "_migrations";

/**
 * Runs each migration exactly once, ever. Already-applied migrations
 * (tracked by ID in the `_migrations` collection) are skipped, so this
 * is safe to call on every server startup or as a manual script.
 */
export async function runMigrations(migrations: Migration[]): Promise<void> {
  const ledgerRef = db.collection(MIGRATIONS_COLLECTION);

  for (const migration of migrations) {
    const ledgerDoc = await ledgerRef.doc(migration.id).get();

    if (ledgerDoc.exists) {
      continue;
    }

    console.log(`Running migration "${migration.id}": ${migration.description}`);

    await migration.run();

    await ledgerRef.doc(migration.id).set({
      description: migration.description,
      appliedAt: new Date(),
    });
  }
}
