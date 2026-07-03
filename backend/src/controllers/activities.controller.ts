import { Request, Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth.middleware";
import { activitiesService } from "../services/activities.service";
import { Activity, ActivityStatus, CreateActivityDto, SkillLevel } from "../models/activity.model";
import { parseCreateActivityDto } from "../util/activityValidation.util";
import { requireAdmin } from "../util/admin.util";

type ActivityParams = {
  activityId: string;
};

export async function getMyActivities(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ message: "User not authenticated" });
      return;
    }

    const { sportId, status, date } = req.query;

    const activities = await activitiesService.getMyActivities(req.user.uid, {
      sportId: sportId as string | undefined,
      status: status as ActivityStatus | undefined,
      date: date ? new Date(date as string) : undefined,
    });

    res.status(200).json(activities);
  } catch (error) {
    res.status(500).json({
      message: error instanceof Error ? error.message : "Error getting user activities",
    });
  }
}

export async function listActivities(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const sportId =
      typeof req.query.sportId === "string" ? req.query.sportId : undefined;

    const difficultyLevel =
      typeof req.query.difficultyLevel === "string"
        ? (req.query.difficultyLevel as SkillLevel)
        : undefined;

    const status =
      typeof req.query.status === "string"
        ? (req.query.status as ActivityStatus)
        : undefined;

    const lat =
      typeof req.query.lat === "string" ? Number(req.query.lat) : undefined;

    const lng =
      typeof req.query.lng === "string" ? Number(req.query.lng) : undefined;

    const radiusKm =
      typeof req.query.radiusKm === "string"
        ? Number(req.query.radiusKm)
        : undefined;

    const activities = await activitiesService.listActivities({
      sportId,
      difficultyLevel,
      status,
      lat,
      lng,
      radiusKm,
    });

    res.status(200).json(activities);
  } catch (error) {
    res.status(400).json({
      message:
        error instanceof Error ? error.message : "Error listing activities",
    });
  }
}

export async function createActivity(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        message: "User not authenticated",
      });
      return;
    }

    const data = parseCreateActivityDto(req.body);

    const activity = await activitiesService.createActivity(req.user.uid, data);

    res.status(201).json(activity);
  } catch (error) {
    res.status(400).json({
      message:
        error instanceof Error ? error.message : "Error creating activity",
    });
  }
}

export async function getActivityById(
  req: AuthenticatedRequest<ActivityParams>,
  res: Response
): Promise<void> {
  try {
    const { activityId } = req.params;

    const activity = await activitiesService.getActivityById(activityId);

    if (!activity) {
      res.status(404).json({
        message: "Activity not found",
      });
      return;
    }

    res.status(200).json(activity);
  } catch (error) {
    res.status(500).json({
      message:
        error instanceof Error ? error.message : "Error getting activity",
    });
  }
}

export async function updateActivity(
  req: AuthenticatedRequest<ActivityParams>,
  res: Response
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        message: "User not authenticated",
      });
      return;
    }

    const { activityId } = req.params;

    const updateData = {
      ...req.body,
      date: req.body.date ? new Date(req.body.date) : undefined,
    };

    const activity = await activitiesService.updateActivity(
      activityId,
      req.user.uid,
      updateData,
      req.user.role
    );

    res.status(200).json(activity);
  } catch (error) {
    res.status(400).json({
      message:
        error instanceof Error ? error.message : "Error updating activity",
    });
  }
}

export async function listAdminActivities(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    const isAdmin = requireAdmin(req, res);
    if (!isAdmin) return;

    const status =
      typeof req.query.status === "string"
        ? (req.query.status as ActivityStatus)
        : undefined;

    const createdBy =
      typeof req.query.createdBy === "string"
        ? req.query.createdBy
        : undefined;

    const activities = await activitiesService.listAllActivities({
      status,
      createdBy,
    });

    res.status(200).json(activities);
  } catch (error) {
    res.status(400).json({
      message:
        error instanceof Error
          ? error.message
          : "Error listing admin activities",
    });
  }
}

export async function deleteActivityAsAdmin(
  req: AuthenticatedRequest<ActivityParams>,
  res: Response
): Promise<void> {
  try {
    const isAdmin = requireAdmin(req, res);
    if (!isAdmin) return;

    const { activityId } = req.params;
    await activitiesService.deleteActivityAsAdmin(activityId);

    res.status(200).json({ message: "Activity deleted successfully" });
  } catch (error) {
    res.status(400).json({
      message:
        error instanceof Error
          ? error.message
          : "Error deleting activity",
    });
  }
}

export async function cancelActivity(
  req: AuthenticatedRequest<ActivityParams>,
  res: Response
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        message: "User not authenticated",
      });
      return;
    }

    const { activityId } = req.params;

    const activity = await activitiesService.cancelActivity(
      activityId,
      req.user.uid
    );

    res.status(200).json(activity);
  } catch (error) {
    res.status(400).json({
      message:
        error instanceof Error ? error.message : "Error cancelling activity",
    });
  }
}

export async function joinActivity(
  req: AuthenticatedRequest<ActivityParams>,
  res: Response
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        message: "User not authenticated",
      });
      return;
    }

    const { activityId } = req.params;

    const activity = await activitiesService.joinActivity(
      activityId,
      req.user.uid
    );

    res.status(200).json(activity);
  } catch (error) {
    res.status(400).json({
      message:
        error instanceof Error ? error.message : "Error joining activity",
    });
  }
}

export async function leaveActivity(
  req: AuthenticatedRequest<ActivityParams>,
  res: Response
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        message: "User not authenticated",
      });
      return;
    }

    const { activityId } = req.params;

    const activity = await activitiesService.leaveActivity(
      activityId,
      req.user.uid
    );

    res.status(200).json(activity);
  } catch (error) {
    res.status(400).json({
      message:
        error instanceof Error ? error.message : "Error leaving activity",
    });
  }
}

export async function removeParticipant(
  req: AuthenticatedRequest<ActivityParams>,
  res: Response
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        message: "User not authenticated",
      });
      return;
    }

    const { activityId } = req.params;
    const { participantId } = req.body;

    if (!participantId) {
      res.status(400).json({
        message: "participantId is required",
      });
      return;
    }

    const activity = await activitiesService.removeParticipant(
      activityId,
      req.user.uid,
      participantId
    );

    res.status(200).json(activity);
  } catch (error) {
    res.status(400).json({
      message:
        error instanceof Error ? error.message : "Error removing participant",
    });
  }
}

export async function admitFromWaitlist(
  req: AuthenticatedRequest<ActivityParams>,
  res: Response
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        message: "User not authenticated",
      });
      return;
    }

    const { activityId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      res.status(400).json({
        message: "userId is required",
      });
      return;
    }

    const activity = await activitiesService.admitFromWaitlist(
      activityId,
      req.user.uid,
      userId
    );

    res.status(200).json(activity);
  } catch (error) {
    res.status(400).json({
      message:
        error instanceof Error
          ? error.message
          : "Error admitting user from waitlist",
    });
  }
}

export async function rejectFromWaitlist(
  req: AuthenticatedRequest<ActivityParams>,
  res: Response
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ message: "User not authenticated" });
      return;
    }

    const { activityId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      res.status(400).json({ message: "userId is required" });
      return;
    }

    const activity = await activitiesService.rejectFromWaitlist(
      activityId,
      req.user.uid,
      userId
    );

    res.status(200).json(activity);
  } catch (error) {
    res.status(400).json({
      message:
        error instanceof Error
          ? error.message
          : "Error rejecting user from waitlist",
    });
  }
}
