import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import {
  getMe,
  updateMe,
  createMyProfile,
  getUserProfile,
  searchUsers,
  listUsers,
  updateUserRole,
  banUser,
  reactivateUser,
  deleteUser,
} from "../controllers/users.controller";

const router = Router();

// Own profile
router.post("/profile", authMiddleware, createMyProfile);
router.get("/me", authMiddleware, getMe);
router.patch("/me", authMiddleware, updateMe);

// Search
router.get("/search", authMiddleware, searchUsers);

// Public profile
router.get("/:userId", authMiddleware, getUserProfile);

// Admin — user management
router.get("/", authMiddleware, listUsers);
router.patch("/:userId/role", authMiddleware, updateUserRole);
router.patch("/:userId/ban", authMiddleware, banUser);
router.patch("/:userId/reactivate", authMiddleware, reactivateUser);
router.delete("/:userId", authMiddleware, deleteUser);

export default router;
