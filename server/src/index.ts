import "dotenv/config";
import express from "express";
import cors from "cors";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok", uptime: process.uptime() });
});

const port = Number(process.env.PORT) || 3000;

app.listen(port, () => {
  console.log(`Hive API listening on http://localhost:${port}`);
});
