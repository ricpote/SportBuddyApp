import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import { listSports, getSportById } from "../controllers/sports.controller";

const router = Router();

router.get("/", authMiddleware, listSports);

router.get("/:sportId", authMiddleware, getSportById);

export default router;
