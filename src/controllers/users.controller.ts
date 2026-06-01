// src/controllers/users.controller.ts

import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth.middleware";
import { usersService } from "../services/users.service";

export async function getMe(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({
        message: "User not authenticated",
      });
    }

    const user = await usersService.getUserByFirebaseUid(req.user.uid);

    if (!user) {
      return res.status(404).json({
        message: "User profile not found",
      });
    }

    return res.json(user);
  } catch (error) {
    return res.status(500).json({
      message: "Error getting current user",
    });
  }
}