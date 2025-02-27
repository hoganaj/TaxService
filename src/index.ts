import "reflect-metadata";
import express from "express";
import { AppDataSource } from "./database/data-source";
import taxRoutes from './routes/taxRoutes';
import logger from "./utils/logger";
import { initTaxController } from "./controllers/TaxController";

const app = express();
app.use(express.json());

AppDataSource.initialize()
.then(() => {
  logger.info("Database connected!")
  initTaxController(AppDataSource);
  app.use(taxRoutes);
})
.catch((err) => logger.error("Database connection error:", err));

const PORT = 3000;
app.listen(PORT, () => logger.info(`Server running on port ${PORT}`));