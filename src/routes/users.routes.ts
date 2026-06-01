// src/routes/users.routes.ts

import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import { getMe } from "../controllers/users.controller.ts";

const router = Router();

router.get("/me", authMiddleware, getMe);

export default router;