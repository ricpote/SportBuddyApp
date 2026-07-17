// src/app.ts

import express, { NextFunction, Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import usersRoutes from "./routes/users.routes";
import activitiesRoutes from "./routes/activities.route";
import sportsRoutes from "./routes/sports.routes";
import messagesRoutes from "./routes/messages.route";
import notificationsRoutes from "./routes/notifications.route";
import friendsRoutes from "./routes/friends.route";
import conversationsRoutes from "./routes/conversations.route";
import badgesRoutes from "./routes/badges.route";

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "2mb" }));

app.use(
  "/api",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 300,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

app.get("/", (req, res) => {
  res.json({
    message: "SportBuddy API is running",
  });
});

app.use("/api/users", usersRoutes);
app.use("/api/activities", activitiesRoutes);
app.use("/api/sports", sportsRoutes);
app.use("/api/activities/:activityId/messages", messagesRoutes);
app.use("/api/notifications", notificationsRoutes);
app.use("/api/friends", friendsRoutes);
app.use("/api/conversations", conversationsRoutes);
app.use("/api/badges", badgesRoutes);

app.use((req: Request, res: Response) => {
  res.status(404).json({ message: "Not found" });
});

app.use((err: unknown, req: Request, res: Response, next: NextFunction) => {
  if (res.headersSent) {
    next(err);
    return;
  }

  console.error(err);
  res.status(400).json({ message: "Invalid request" });
});

export default app;
