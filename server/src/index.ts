import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import pinoHttp from "pino-http";
import { AppDataSource } from "./config/data-source";
import { env } from "./config/env";
import { logger } from "./config/logger";
import { connectRedis, redis } from "./config/redis";
import { errorHandler, notFoundHandler } from "./middlewares/error";
import { apiRouter } from "./routes";

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: env.CORS_ORIGIN,
    credentials: true,
  }),
);
app.use(express.json({ limit: "100kb" }));
app.use(cookieParser());
app.use(pinoHttp({ logger }));

app.use("/api/v1", apiRouter);

app.use(notFoundHandler);
app.use(errorHandler);

async function start() {
  await AppDataSource.initialize();
  logger.info("Database connected");

  await connectRedis();

  const server = app.listen(env.PORT, () => {
    logger.info(`Hive API listening on http://localhost:${env.PORT}`);
  });

  const shutdown = async (signal: string) => {
    logger.info(`${signal} received, shutting down`);
    server.close();
    await AppDataSource.destroy();
    redis.disconnect();
    process.exit(0);
  };

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

start().catch((err) => {
  logger.error({ err }, "Failed to start server");
  process.exit(1);
});
