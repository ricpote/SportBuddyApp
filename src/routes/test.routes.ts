// src/routes/test.routes.ts

import express, { Response } from "express";
import {
  authMiddleware,
  AuthenticatedRequest,
} from "../middleware/auth.middleware";

const router = express.Router();

router.get("/protected", authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  return res.json({
    message: "You are authenticated",
    user: req.user,
  });
});

export default router;