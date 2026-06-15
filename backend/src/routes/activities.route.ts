import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import {
  listActivities,
  getMyActivities,
  createActivity,
  getActivityById,
  updateActivity,
  cancelActivity,
  removeParticipant,
  admitFromWaitlist,
  joinActivity,
  leaveActivity,
} from "../controllers/activities.controller";

const router = Router();

router.get("/", authMiddleware, listActivities);

router.get("/me", authMiddleware, getMyActivities);

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

router.post("/:activityId/join", authMiddleware, joinActivity);

router.delete("/:activityId/leave", authMiddleware, leaveActivity);

export default router;