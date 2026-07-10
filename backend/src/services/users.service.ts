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

    await this.assertNameAndEmailAvailable(name, email);

    // We use Firebase UID as the Firestore document ID.
    // This makes it easy to find the logged-in user.
    const user = createUserObject(firebaseUid, firebaseUid, {
      ...data,
      name,
      email,
    });

    const userDoc = JSON.parse(JSON.stringify(user));

    await this.usersRef.doc(firebaseUid).set(userDoc);

    return user;
  }

  // Garante que não há dois perfis com o mesmo nome ou email
  // (comparação sem maiúsculas/minúsculas; ignora contas apagadas).
  private async assertNameAndEmailAvailable(
    name: string,
    email?: string,
    excludeUserId?: string
  ): Promise<void> {
    const snapshot = await this.usersRef.get();

    const normalizedName = name.toLowerCase();
    const normalizedEmail = email?.toLowerCase();

    for (const doc of snapshot.docs) {
      if (doc.id === excludeUserId) continue;

      const user = doc.data() as User;
      if (user.status === "deleted") continue;

      if (user.name?.trim().toLowerCase() === normalizedName) {
        throw new Error("Já existe um utilizador com este nome");
      }

      if (
        normalizedEmail &&
        user.email?.trim().toLowerCase() === normalizedEmail
      ) {
        throw new Error("Já existe um utilizador com este email");
      }
    }
  }

  async getUserByFirebaseUid(firebaseUid: string): Promise<User | null> {
    const userDoc = await this.usersRef.doc(firebaseUid).get();

    if (!userDoc.exists) {
      return null;
    }

    return userDoc.data() as User;
  }

  async getUserById(userId: string): Promise<User | null> {
    const userDoc = await this.usersRef.doc(userId).get();

    if (!userDoc.exists) {
      return null;
    }

    return userDoc.data() as User;
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

    if (data.name !== undefined) {
      const name = data.name.trim();

      if (!name) {
        throw new Error("O nome é obrigatório");
      }

      if (name.length > 60) {
        throw new Error("O nome é demasiado longo");
      }

      await this.assertNameAndEmailAvailable(name, undefined, firebaseUid);
      data = { ...data, name };
    }

    if (data.bio !== undefined && data.bio.length > 300) {
      throw new Error("A bio é demasiado longa");
    }

    const updatedUser: User = {
      ...user,
      ...data,
      updatedAt: new Date(),
    };

    await this.usersRef.doc(firebaseUid).update({
      ...data,
      updatedAt: updatedUser.updatedAt,
    });

    return updatedUser;
  }

  async updateUserRole(userId: string, role: UserRole): Promise<User> {
    const user = await this.getUserById(userId);

    if (!user) {
      throw new Error("User not found");
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

  async updateUserStatus(userId: string, status: UserStatus): Promise<User> {
    const user = await this.getUserById(userId);

    if (!user) {
      throw new Error("User not found");
    }

    const updatedUser: User = {
      ...user,
      status,
      updatedAt: new Date(),
    };

    await this.usersRef.doc(userId).update({
      status,
      updatedAt: updatedUser.updatedAt,
    });

    return updatedUser;
  }

  async banUser(userId: string): Promise<User> {
    return this.updateUserStatus(userId, "banned");
  }

  async reactivateUser(userId: string): Promise<User> {
    return this.updateUserStatus(userId, "active");
  }

  async softDeleteUser(userId: string): Promise<User> {
    return this.updateUserStatus(userId, "deleted");
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
      | "fairPlayVotesReceived"
    >,
    delta: 1 | -1
  ): Promise<void> {
    await this.usersRef
      .doc(userId)
      .update({ [`stats.${field}`]: FieldValue.increment(delta) });
  }

  async searchUsers(query: string, requesterId: string): Promise<{ id: string; name: string; avatarUrl?: string }[]> {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    const snapshot = await this.usersRef.where("status", "==", "active").get();

    return snapshot.docs
      .map((doc) => doc.data() as User)
      .filter((u) => u.id !== requesterId && u.name.toLowerCase().startsWith(q))
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
    return snapshot.docs.map((doc) => doc.data() as User);
  }
}

export const usersService = new UsersService();