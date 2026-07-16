import { db } from "../config/firebase";
import { FieldValue } from "firebase-admin/firestore";
import {
  CreateUserDto,
  ListUsersFilters,
  UpdateUserDto,
  User,
  UserRole,
  UserStatus,
  createUserObject,
} from "../models/user.model";

const USERS_COLLECTION = "users";

// O Firestore devolve Timestamps para campos de data, não Date normais —
// sem isto, res.json() envia-os como {_seconds, _nanoseconds} e o frontend
// lê "Invalid Date".
function toDateIfTimestamp(value: unknown): any {
  if (value && typeof value === "object" && "toDate" in value) {
    return (value as FirebaseFirestore.Timestamp).toDate();
  }
  return value;
}

function normalizeUser(data: FirebaseFirestore.DocumentData): User {
  return {
    ...data,
    createdAt: toDateIfTimestamp(data.createdAt),
    updatedAt: toDateIfTimestamp(data.updatedAt),
    bannedUntil: data.bannedUntil != null ? toDateIfTimestamp(data.bannedUntil) : data.bannedUntil,
  } as User;
}

export class UsersService {
  private usersRef = db.collection(USERS_COLLECTION);

  async createUserProfile(
    firebaseUid: string,
    data: CreateUserDto
  ): Promise<User> {
    const existingUser = await this.getUserByFirebaseUid(firebaseUid);

    if (existingUser) {
      throw new Error("User profile already exists");
    }

    const name = data.name?.trim();
    const email = data.email?.trim().toLowerCase();

    if (!name) {
      throw new Error("O nome é obrigatório");
    }

    if (name.length > 60) {
      throw new Error("O nome é demasiado longo");
    }

    if (!email) {
      throw new Error("O email é obrigatório");
    }

    // We use Firebase UID as the Firestore document ID.
    // This makes it easy to find the logged-in user.
    const user = createUserObject(firebaseUid, firebaseUid, {
      ...data,
      name,
      email,
    });

    const userDoc = JSON.parse(JSON.stringify(user));
    const docRef = this.usersRef.doc(firebaseUid);

    await db.runTransaction(async (tx) => {
      await this.assertNameAndEmailAvailable(tx, user.nameLower, user.emailLower);
      tx.set(docRef, userDoc);
    });

    return user;
  }

  private async assertNameAndEmailAvailable(
    tx: FirebaseFirestore.Transaction,
    nameLower: string,
    emailLower?: string,
    excludeUserId?: string
  ): Promise<void> {
    const [nameSnap, emailSnap] = await Promise.all([
      tx.get(this.usersRef.where("nameLower", "==", nameLower)),
      emailLower
        ? tx.get(this.usersRef.where("emailLower", "==", emailLower))
        : Promise.resolve(null),
    ]);

    const isConflict = (doc: FirebaseFirestore.QueryDocumentSnapshot) =>
      doc.id !== excludeUserId && (doc.data() as User).status !== "deleted";

    if (nameSnap.docs.some(isConflict)) {
      throw new Error("Já existe um utilizador com este nome");
    }

    if (emailSnap && emailSnap.docs.some(isConflict)) {
      throw new Error("Já existe um utilizador com este email");
    }
  }

  async getUserByFirebaseUid(firebaseUid: string): Promise<User | null> {
    const userDoc = await this.usersRef.doc(firebaseUid).get();

    if (!userDoc.exists) {
      return null;
    }

    return normalizeUser(userDoc.data()!);
  }

  async getUserById(userId: string): Promise<User | null> {
    const userDoc = await this.usersRef.doc(userId).get();

    if (!userDoc.exists) {
      return null;
    }

    return normalizeUser(userDoc.data()!);
  }

  async getMutualFriends(
    requesterId: string,
    targetId: string,
    limit = 5
  ): Promise<{ id: string; name: string; avatarUrl?: string }[]> {
    const [requesterDoc, targetDoc] = await Promise.all([
      this.usersRef.doc(requesterId).get(),
      this.usersRef.doc(targetId).get(),
    ]);
    const requesterFriends: string[] = requesterDoc.data()?.friends ?? [];
    const targetFriends: string[] = targetDoc.data()?.friends ?? [];
    const targetSet = new Set(targetFriends);
    const mutualIds = requesterFriends.filter(id => targetSet.has(id)).slice(0, limit);
    const profiles = await Promise.all(
      mutualIds.map(async id => {
        const doc = await this.usersRef.doc(id).get();
        const data = doc.data();
        return { id, name: data?.name ?? '', avatarUrl: data?.avatarUrl };
      })
    );
    return profiles;
  }

  async getCurrentUser(firebaseUid: string): Promise<User> {
    const user = await this.getUserByFirebaseUid(firebaseUid);

    if (!user) {
      throw new Error("User profile not found");
    }

    return user;
  }

  async updateUserProfile(
    firebaseUid: string,
    data: UpdateUserDto
  ): Promise<User> {
    const user = await this.getUserByFirebaseUid(firebaseUid);

    if (!user) {
      throw new Error("User profile not found");
    }

    let nameLower: string | undefined;

    if (data.name !== undefined) {
      const name = data.name.trim();

      if (!name) {
        throw new Error("O nome é obrigatório");
      }

      if (name.length > 60) {
        throw new Error("O nome é demasiado longo");
      }

      nameLower = name.toLowerCase();
      data = { ...data, name };
    }

    if (data.bio !== undefined && data.bio.length > 300) {
      throw new Error("A bio é demasiado longa");
    }

    const changes: Record<string, unknown> = { ...data, updatedAt: new Date() };
    if (nameLower !== undefined) {
      changes.nameLower = nameLower;
    }

    const updatedUser: User = {
      ...user,
      ...data,
      ...(nameLower !== undefined ? { nameLower } : {}),
      updatedAt: changes.updatedAt as Date,
    };

    const docRef = this.usersRef.doc(firebaseUid);

    if (nameLower !== undefined) {
      await db.runTransaction(async (tx) => {
        await this.assertNameAndEmailAvailable(tx, nameLower!, undefined, firebaseUid);
        tx.update(docRef, changes);
      });
    } else {
      await docRef.update(changes);
    }

    return updatedUser;
  }

  async updateUserRole(userId: string, role: UserRole): Promise<User> {
    const user = await this.getUserById(userId);

    if (!user) {
      throw new Error("User not found");
    }

    // Nenhum admin pode mudar o role de outro admin (nem do próprio).
    if (user.role === "admin") {
      throw new Error("Não podes alterar o role de um administrador");
    }

    const updatedUser: User = {
      ...user,
      role,
      updatedAt: new Date(),
    };

    await this.usersRef.doc(userId).update({
      role,
      updatedAt: updatedUser.updatedAt,
    });

    return updatedUser;
  }

  async updateUserStatus(
    userId: string,
    status: UserStatus,
    bannedUntil: Date | null = null
  ): Promise<User> {
    const user = await this.getUserById(userId);

    if (!user) {
      throw new Error("User not found");
    }

    const updatedUser: User = {
      ...user,
      status,
      bannedUntil: bannedUntil ?? undefined,
      updatedAt: new Date(),
    };

    await this.usersRef.doc(userId).update({
      status,
      bannedUntil,
      updatedAt: updatedUser.updatedAt,
    });

    return updatedUser;
  }

  // Ban permanente: sem prazo, só um admin reativa manualmente.
  async banUser(userId: string): Promise<User> {
    return this.updateUserStatus(userId, "banned", null);
  }

  // Suspensão temporária: a conta reativa-se sozinha ao fim de `days` dias
  // (ver auth.middleware.ts, que verifica bannedUntil em cada pedido).
  async suspendUser(userId: string, days: number): Promise<User> {
    const bannedUntil = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    return this.updateUserStatus(userId, "banned", bannedUntil);
  }

  async reactivateUser(userId: string): Promise<User> {
    return this.updateUserStatus(userId, "active", null);
  }

  async softDeleteUser(userId: string): Promise<User> {
    return this.updateUserStatus(userId, "deleted", null);
  }

  async userExists(firebaseUid: string): Promise<boolean> {
    const userDoc = await this.usersRef.doc(firebaseUid).get();
    return userDoc.exists;
  }

  async incrementStat(
    userId: string,
    field: keyof Pick<
      User["stats"],
      | "activitiesJoined"
      | "activitiesCreated"
      | "mvpVotesReceived"
    >,
    delta: 1 | -1
  ): Promise<void> {
    await this.usersRef
      .doc(userId)
      .update({ [`stats.${field}`]: FieldValue.increment(delta) });

    if (delta > 0) {
      this.triggerBadgeCheck(userId);
    }
  }

  async incrementSportStat(
    userId: string,
    sportId: string,
    delta: 1 | -1
  ): Promise<void> {
    await this.usersRef.doc(userId).update({
      [`stats.bySport.${sportId}.joined`]: FieldValue.increment(delta),
    });

    if (delta > 0) {
      this.triggerBadgeCheck(userId);
    }
  }

  private triggerBadgeCheck(userId: string): void {
    // Lazy require to avoid a circular import between users.service and badges.service.
    const { badgesService } = require("./badges.service") as typeof import("./badges.service");
    badgesService.checkAndAwardBadges(userId).catch((error) => {
      console.error(`Error checking badges for user ${userId}:`, error);
    });
  }

  async setDisplayedBadge(
    firebaseUid: string,
    badgeId: string | null
  ): Promise<User> {
    const user = await this.getUserByFirebaseUid(firebaseUid);

    if (!user) {
      throw new Error("User profile not found");
    }

    if (badgeId !== null && !user.stats.badges.includes(badgeId)) {
      throw new Error("Badge not unlocked by this user");
    }

    const updatedUser: User = {
      ...user,
      displayedBadge: badgeId ?? undefined,
      updatedAt: new Date(),
    };

    await this.usersRef.doc(firebaseUid).update({
      displayedBadge: badgeId ?? FieldValue.delete(),
      updatedAt: updatedUser.updatedAt,
    });

    return updatedUser;
  }

  async searchUsers(query: string, requesterId: string): Promise<{ id: string; name: string; avatarUrl?: string }[]> {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    const snapshot = await this.usersRef
      .where("nameLower", ">=", q)
      .where("nameLower", "<", q + "")
      .limit(20)
      .get();

    return snapshot.docs
      .map((doc) => doc.data() as User)
      .filter((u) => u.id !== requesterId && u.status === "active")
      .map((u) => ({ id: u.id, name: u.name, avatarUrl: u.avatarUrl }));
  }

  async listUsers(filters: ListUsersFilters = {}): Promise<User[]> {
    let query: FirebaseFirestore.Query = this.usersRef;

    if (filters.role) {
      query = query.where("role", "==", filters.role);
    }

    if (filters.status) {
      query = query.where("status", "==", filters.status);
    }

    const snapshot = await query.orderBy("createdAt", "desc").get();
    const users = snapshot.docs.map((doc) => normalizeUser(doc.data()));

    // Reflete no painel de admin as suspensões cujo prazo já passou, mesmo
    // que a pessoa ainda não tenha voltado a entrar (o que só corrigiria o
    // registo dela via auth.middleware.ts).
    const now = new Date();
    const expired = users.filter(
      (u) => u.status === "banned" && u.bannedUntil && new Date(u.bannedUntil) <= now
    );
    if (expired.length > 0) {
      await Promise.all(
        expired.map((u) =>
          this.usersRef.doc(u.id).update({ status: "active", bannedUntil: null, updatedAt: now })
        )
      );
      expired.forEach((u) => {
        u.status = "active";
        u.bannedUntil = null;
      });
    }

    return users;
  }
}

export const usersService = new UsersService();