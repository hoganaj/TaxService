import "reflect-metadata";
import { DataSource } from "typeorm";
import { SaleEvent } from "../entity/SaleEvent";
import { SaleItem } from "../entity/SaleItem";
import { TaxPayment } from "../entity/TaxPayment";
import { Amendment } from "../entity/Amendment";
import path from "path";

const dbPath = path.join(__dirname, "tax_service.sqlite");

export const AppDataSource = new DataSource({
  type: "sqlite",
  database: dbPath,
  entities: [SaleEvent, SaleItem, TaxPayment, Amendment],
  synchronize: true,
});
