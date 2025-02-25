import "reflect-metadata";
import { DataSource } from "typeorm";
import { SaleEvent } from "./entity/SaleEvent";
import { SaleItem } from "./entity/SaleItem";
import { TaxPayment } from "./entity/TaxPayment";
import { Amendment } from "./entity/Amendment";

export const AppDataSource = new DataSource({
  type: "sqlite",
  database: "tax_service.sqlite",
  entities: [SaleEvent, SaleItem, TaxPayment, Amendment],
  synchronize: true,
});
