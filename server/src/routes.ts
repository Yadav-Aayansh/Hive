import { Router } from "express";
import { AppDataSource } from "./config/data-source";
import { authRouter } from "./modules/auth/auth.routes";
import { collegeRouter } from "./modules/college/college.routes";
import { sendSuccess } from "./utils/response";

export const apiRouter = Router();

apiRouter.get("/health", (_req, res) =>
  sendSuccess(res, {
    status: "ok",
    uptime: process.uptime(),
    database: AppDataSource.isInitialized ? "connected" : "disconnected",
  }),
);

apiRouter.use("/auth", authRouter);
apiRouter.use("/colleges", collegeRouter);
