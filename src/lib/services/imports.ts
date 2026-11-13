import { post } from "../api/client";
import type { ImportRow, ImportValidation } from "../types";

export const importsService = {
  validate: (rows: ImportRow[]) => post<ImportValidation>("/import/opening-balances/validate", { rows }),
  run: (rows: ImportRow[]) => post<{ imported: number; total: number }>("/import/opening-balances", { rows }),
};
