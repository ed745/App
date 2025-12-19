
export type CurrencyCode = 'USD' | 'EUR' | 'MXN' | 'COP' | 'GBP';
export type CategoryType = 'income' | 'expense';

export interface Currency {
  code: CurrencyCode;
  symbol: string;
  rate: number;
}

export interface FinanceCategory {
  id: string;
  parentId: string | null;
  name: string;
  type: CategoryType;
  amount: number;
  budget: number;
  color: string;
  icon: string;
  sourceIncomeId?: string; // ID de la fuente de ingreso que financia este gasto
}

export interface MonthlyStats {
  categories: FinanceCategory[];
}
