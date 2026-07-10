// src/app.ts

import express from "express";
import cors from "cors";
import usersRoutes from "./routes/users.routes";
import activitiesRoutes from "./routes/activities.route";
import sportsRoutes from "./routes/sports.routes";
import messagesRoutes from "./routes/messages.route";
import notificationsRoutes from "./routes/notifications.route";
import friendsRoutes from "./routes/friends.route";
import conversationsRoutes from "./routes/conversations.route";
import badgesRoutes from "./routes/badges.route";

const app = express();

app.use(cors());
app.use(express.json());

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

export default app;
