import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import {
  createActivity,
  getActivityById,
  updateActivity,
  cancelActivity,
  removeParticipant,
  admitFromWaitlist,
} from "../controllers/activities.controller";

const router = Router();

router.post("/", authMiddleware, createActivity);

router.get("/:activityId", authMiddleware, getActivityById);

router.patch("/:activityId", authMiddleware, updateActivity);

router.patch("/:activityId/cancel", authMiddleware, cancelActivity);

router.patch(
  "/:activityId/remove-participant",
  authMiddleware,
  removeParticipant
);

router.patch(
  "/:activityId/admit-from-waitlist",
  authMiddleware,
  admitFromWaitlist
);

export default router;