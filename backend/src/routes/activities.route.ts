import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import {
  listActivities,
  createActivity,
  getActivityById,
  updateActivity,
  cancelActivity,
  joinActivity,
  leaveActivity,
  removeParticipant,
  admitFromWaitlist,
} from "../controllers/activities.controller";

const router = Router();

router.get("/", authMiddleware, listActivities);

router.post("/", authMiddleware, createActivity);

router.get("/:activityId", authMiddleware, getActivityById);

router.post("/:activityId/join", authMiddleware, joinActivity);

router.post("/:activityId/leave", authMiddleware, leaveActivity);

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