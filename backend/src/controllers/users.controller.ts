import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth.middleware";
import { usersService } from "../services/users.service";
import { badgesService } from "../services/badges.service";
import { PublicUser, UpdateUserDto, User, UserRole } from "../models/user.model";
import { requireAdmin } from "../util/admin.util";

type UserParams = { userId: string };

function toPublicProfile(user: User): PublicUser {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { email: _email, firebaseUid: _uid, ...publicFields } = user;
  return publicFields as PublicUser;
}

export async function getMe(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const user = await usersService.getUserByFirebaseUid(req.user.uid);

    if (!user) {
      return res.status(404).json({ message: "User profile not found" });
    }

    return res.json(toPublicProfile(user));
  } catch {
    return res.status(500).json({ message: "Error getting current user" });
  }
}

export async function createMyProfile(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const user = await usersService.createUserProfile(req.user.uid, {
      name: req.body.name,
      email: req.user.email ?? req.body.email,
      sports: req.body.sports,
      location: req.body.location,
    });

    return res.status(201).json(user);
  } catch (error) {
    return res.status(400).json({
      message:
        error instanceof Error ? error.message : "Error creating user profile",
    });
  }
}

export async function updateMe(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const data: UpdateUserDto = {};

    if (req.body.name !== undefined) data.name = req.body.name;
    if (req.body.bio !== undefined) data.bio = req.body.bio;
    if (req.body.avatarUrl !== undefined) data.avatarUrl = req.body.avatarUrl;
    if (req.body.sports !== undefined) data.sports = req.body.sports;
    if (req.body.location !== undefined) data.location = req.body.location;

    if (Object.keys(data).length === 0) {
      return res.status(400).json({ message: "No fields to update" });
    }

    const updated = await usersService.updateUserProfile(req.user.uid, data);
    return res.json(updated);
  } catch (error) {
    return res.status(400).json({
      message:
        error instanceof Error ? error.message : "Error updating user profile",
    });
  }
}

export async function uploadMyAvatar(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const { imageData } = req.body as { imageData?: string };

    if (!imageData || typeof imageData !== "string") {
      return res.status(400).json({ message: "imageData is required" });
    }

    if (!imageData.startsWith("data:image/")) {
      return res.status(400).json({ message: "imageData must be a data URL" });
    }

    // Firestore documents have a size limit, so reject oversized avatars.
    if (imageData.length > 700_000) {
      return res.status(400).json({ message: "Avatar image is too large" });
    }

    const updated = await usersService.updateUserProfile(req.user.uid, {
      avatarUrl: imageData,
    });

    return res.json(toPublicProfile(updated));
  } catch (error) {
    return res.status(400).json({
      message: error instanceof Error ? error.message : "Error saving avatar",
export async function searchUsers(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ message: "User not authenticated" });
      return;
    }

    const q = typeof req.query.q === "string" ? req.query.q : "";
    if (!q.trim()) {
      res.status(200).json([]);
      return;
    }

    const user = await usersService.getUserByFirebaseUid(req.user.uid);
    if (!user) {
      res.status(404).json({ message: "User profile not found" });
      return;
    }

    const results = await usersService.searchUsers(q, user.id);
    res.status(200).json(results);
  } catch (error) {
    res.status(400).json({
      message: error instanceof Error ? error.message : "Error searching users",
    });
  }
}

export async function setDisplayedBadge(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const { badgeId } = req.body as { badgeId: string | null };

    if (badgeId !== null && typeof badgeId !== "string") {
      return res
        .status(400)
        .json({ message: "badgeId must be a string or null" });
    }

    const user = await usersService.setDisplayedBadge(req.user.uid, badgeId);
    return res.json(toPublicProfile(user));
  } catch (error) {
    return res.status(400).json({
      message:
        error instanceof Error ? error.message : "Error setting displayed badge",
    });
  }
}

export async function getUserProfile(
  req: AuthenticatedRequest<UserParams>,
  res: Response
) {
  try {
    const { userId } = req.params;
    const user = await usersService.getUserById(userId);

    if (!user || user.status === "deleted") {
      return res.status(404).json({ message: "User not found" });
    }

    // Não expor dados privados (localização e lista de amigos) de outros
    // utilizadores; devolver apenas se o requester é amigo deste perfil.
    const { location: _location, friends, ...publicFields } = toPublicProfile(user);
    const isFriend = req.user
      ? (friends ?? []).includes(req.user.uid)
      : false;

    return res.json({ ...publicFields, isFriend });
  } catch {
    return res.status(500).json({ message: "Error getting user profile" });
  }
}

export async function getMyBadges(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const badges = await badgesService.getUserBadges(req.user.uid);

    if (!badges) {
      return res.status(404).json({ message: "User profile not found" });
    }

    return res.json(badges);
  } catch {
    return res.status(500).json({ message: "Error getting badges" });
  }
}

export async function getUserBadges(
  req: AuthenticatedRequest<UserParams>,
  res: Response
) {
  try {
    const { userId } = req.params;
    const user = await usersService.getUserById(userId);

    if (!user || user.status === "deleted") {
      return res.status(404).json({ message: "User not found" });
    }

    const badges = await badgesService.getUserBadges(userId);
    return res.json(badges);
  } catch {
    return res.status(500).json({ message: "Error getting badges" });
  }
}

// ── Admin endpoints ──────────────────────────────────────────────────────────

export async function listUsers(req: AuthenticatedRequest, res: Response) {
  try {
    const isAdmin = requireAdmin(req, res);
    if (!isAdmin) return;

    const { role, status } = req.query as {
      role?: string;
      status?: string;
    };

    const users = await usersService.listUsers({
      role: role as UserRole | undefined,
      status: status as "active" | "banned" | "deleted" | undefined,
    });

    return res.json(users);
  } catch {
    return res.status(500).json({ message: "Error listing users" });
  }
}

export async function updateUserRole(
  req: AuthenticatedRequest<UserParams>,
  res: Response
) {
  try {
    const isAdmin = requireAdmin(req, res);
    if (!isAdmin) return;

    const { userId } = req.params;
    const { role } = req.body as { role?: UserRole };

    const validRoles: UserRole[] = [
      "participant",
      "partner",
      "admin",
    ];

    if (!role || !validRoles.includes(role)) {
      return res.status(400).json({
        message: `role must be one of: ${validRoles.join(", ")}`,
      });
    }

    const updated = await usersService.updateUserRole(userId, role);
    return res.json(updated);
  } catch (error) {
    return res.status(400).json({
      message: error instanceof Error ? error.message : "Error updating role",
    });
  }
}

export async function banUser(
  req: AuthenticatedRequest<UserParams>,
  res: Response
) {
  try {
    const isAdmin = requireAdmin(req, res);
    if (!isAdmin) return;

    const { userId } = req.params;
    if (req.user?.uid === userId) {
      return res.status(400).json({ message: "Admins cannot ban themselves" });
    }
    const updated = await usersService.banUser(userId);
    return res.json(updated);
  } catch (error) {
    return res.status(400).json({
      message: error instanceof Error ? error.message : "Error banning user",
    });
  }
}

export async function reactivateUser(
  req: AuthenticatedRequest<UserParams>,
  res: Response
) {
  try {
    const isAdmin = requireAdmin(req, res);
    if (!isAdmin) return;

    const { userId } = req.params;
    const updated = await usersService.reactivateUser(userId);
    return res.json(updated);
  } catch (error) {
    return res.status(400).json({
      message:
        error instanceof Error ? error.message : "Error reactivating user",
    });
  }
}

export async function deleteUser(
  req: AuthenticatedRequest<UserParams>,
  res: Response
) {
  try {
    const isAdmin = requireAdmin(req, res);
    if (!isAdmin) return;

    const { userId } = req.params;
    if (req.user?.uid === userId) {
      return res
        .status(400)
        .json({ message: "Admins cannot delete themselves" });
    }
    await usersService.softDeleteUser(userId);
    return res.json({ message: "User deleted successfully" });
  } catch (error) {
    return res.status(400).json({
      message: error instanceof Error ? error.message : "Error deleting user",
    });
  }
}
