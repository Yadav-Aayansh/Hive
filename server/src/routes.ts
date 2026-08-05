import { Router } from "express";
import { AppDataSource } from "./config/data-source";
import { announcementRouter } from "./modules/announcement/announcement.routes";
import { authRouter } from "./modules/auth/auth.routes";
import { clubRouter } from "./modules/club/club.routes";
import { collegeRouter } from "./modules/college/college.routes";
import { eventRouter } from "./modules/event/event.routes";
import { uploadRouter } from "./modules/upload/upload.routes";
import { userRouter } from "./modules/user/user.routes";
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
apiRouter.use("/users", userRouter);
apiRouter.use("/colleges", collegeRouter);
apiRouter.use("/clubs", clubRouter);
apiRouter.use("/events", eventRouter);
apiRouter.use("/announcements", announcementRouter);
apiRouter.use("/uploads", uploadRouter);
