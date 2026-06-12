import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth.middleware";
import { activitiesService } from "../services/activities.service";
import { CreateActivityDto } from "../models/activity.model";

type ActivityParams = {
  activityId: string;
};

export async function listActivities(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    const activities = await activitiesService.listActivities();

    res.status(200).json(activities);
  } catch (error) {
    res.status(500).json({
      message:
        error instanceof Error ? error.message : "Error listing activities",
    });
  }
}

export async function createActivity(
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

    const data: CreateActivityDto = {
      title: req.body.title,
      description: req.body.description,
      sportId: req.body.sportId,
      maxParticipants: req.body.maxParticipants,
      location: req.body.location,
      date: new Date(req.body.date),
      difficultyLevel: req.body.difficultyLevel,
      requiresApproval: req.body.requiresApproval ?? false,
    };

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
      updateData
    );

    res.status(200).json(activity);
  } catch (error) {
    res.status(400).json({
      message:
        error instanceof Error ? error.message : "Error updating activity",
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