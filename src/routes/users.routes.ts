// src/routes/users.routes.ts
import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import { getMe, createMyProfile } from "../controllers/users.controller";

const router = Router();

router.post("/profile", authMiddleware, createMyProfile);
router.get("/me", authMiddleware, getMe);

export default router;