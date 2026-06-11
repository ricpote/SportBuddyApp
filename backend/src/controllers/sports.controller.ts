import { Request, Response } from "express";
import { sportsService } from "../services/sports.service";

export async function listSports(req: Request, res: Response): Promise<void> {
  try {
    const sports = await sportsService.listSports();

    res.status(200).json(sports);
  } catch (error) {
    res.status(500).json({
      message: error instanceof Error ? error.message : "Error listing sports",
    });
  }
}

export async function getSportById(req: Request, res: Response): Promise<void> {
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
