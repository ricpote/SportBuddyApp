// src/app.ts

import express from "express";
import cors from "cors";
import usersRoutes from "./routes/users.routes.ts";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    message: "SportBuddy API is running",
  });
});

app.use("/api/users", usersRoutes);

export default app;