import { Request, Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth.middleware";
import { sportsService } from "../services/sports.service";
import { usersService } from "../services/users.service";
import { CreateSportDto, UpdateSportDto } from "../models/sport.model";

type SportParams = {
  sportId: string;
};

async function requireAdmin(
  req: AuthenticatedRequest,
  res: Response,
): Promise<boolean> {
  if (!req.user) {
    res.status(401).json({ message: "User not authenticated" });
    return false;
  }

  const user = await usersService.getUserByFirebaseUid(req.user.uid);

  if (!user || user.role !== "admin") {
    res.status(403).json({ message: "Admin access required" });
    return false;
  }

  return true;
}

export async function listSports(_req: Request, res: Response): Promise<void> {
  try {
    const sports = await sportsService.listSports();
    res.status(200).json(sports);
  } catch (error) {
    res.status(500).json({
      message: error instanceof Error ? error.message : "Error listing sports",
    });
  }
}

export async function getSportById(
  req: Request<SportParams>,
  res: Response,
): Promise<void> {
  try {
    const { sportId } = req.params;
    const sport = await sportsService.getSportById(sportId);

    if (!sport) {
      res.status(404).json({ message: "Sport not found" });
      return;
    }

    res.status(200).json(sport);
  } catch (error) {
    res.status(500).json({
      message: error instanceof Error ? error.message : "Error getting sport",
    });
  }
}

export async function createSport(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  try {
    const isAdmin = await requireAdmin(req, res);
    if (!isAdmin) return;

    const data: CreateSportDto = {
      id: req.body.id,
      name: req.body.name,
      description: req.body.description,
      category: req.body.category,
      emoji: req.body.emoji,
    };

    if (!data.id || !data.name || !data.category || !data.emoji) {
      res
        .status(400)
        .json({ message: "id, name, category and emoji are required" });
      return;
    }

    const sport = await sportsService.createSport(data);
    res.status(201).json(sport);
  } catch (error) {
    res.status(400).json({
      message: error instanceof Error ? error.message : "Error creating sport",
    });
  }
}

export async function updateSport(
  req: AuthenticatedRequest<SportParams>,
  res: Response,
): Promise<void> {
  try {
    const isAdmin = await requireAdmin(req, res);
    if (!isAdmin) return;

    const { sportId } = req.params;
    const data: UpdateSportDto = req.body;

    const sport = await sportsService.updateSport(sportId, data);
    res.status(200).json(sport);
  } catch (error) {
    res.status(400).json({
      message: error instanceof Error ? error.message : "Error updating sport",
    });
  }
}

export async function deleteSport(
  req: AuthenticatedRequest<SportParams>,
  res: Response,
): Promise<void> {
  try {
    const isAdmin = await requireAdmin(req, res);
    if (!isAdmin) return;

    const { sportId } = req.params;
    await sportsService.deleteSport(sportId);

    res.status(200).json({ message: "Sport deleted successfully" });
  } catch (error) {
    res.status(400).json({
      message: error instanceof Error ? error.message : "Error deleting sport",
    });
  }
}
