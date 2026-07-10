import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import {
  getMe,
  updateMe,
  uploadMyAvatar,
  createMyProfile,
  getUserProfile,
  searchUsers,
  listUsers,
  updateUserRole,
  banUser,
  reactivateUser,
  deleteUser,
  setDisplayedBadge,
  getMyBadges,
  getUserBadges,
} from "../controllers/users.controller";

const router = Router();

// Own profile
router.post("/profile", authMiddleware, createMyProfile);
router.get("/me", authMiddleware, getMe);
router.patch("/me", authMiddleware, updateMe);
router.post("/me/avatar", authMiddleware, uploadMyAvatar);
router.patch("/me/displayed-badge", authMiddleware, setDisplayedBadge);
router.get("/me/badges", authMiddleware, getMyBadges);

// Search
router.get("/search", authMiddleware, searchUsers);

// Public profile
router.get("/:userId", authMiddleware, getUserProfile);
router.get("/:userId/badges", authMiddleware, getUserBadges);

// Admin — user management
router.get("/", authMiddleware, listUsers);
router.patch("/:userId/role", authMiddleware, updateUserRole);
router.patch("/:userId/ban", authMiddleware, banUser);
router.patch("/:userId/reactivate", authMiddleware, reactivateUser);
router.delete("/:userId", authMiddleware, deleteUser);

export default router;
