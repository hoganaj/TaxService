import "reflect-metadata";
import express from "express";
import { AppDataSource } from "./data-source";
import { registerRoutes } from "./routes";
import logger from "./logger";

const app = express();
app.use(express.json());

AppDataSource.initialize()
.then(() => logger.info("Database connected!"))
.catch((err) => logger.error("Database connection error:", err));

registerRoutes(app, AppDataSource);

const PORT = 3000;
app.listen(PORT, () => logger.info(`Server running on port ${PORT}`));
