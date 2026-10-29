export interface UserProfile {
  id: string;
  nickname: string;
  fullName: string;
  birthDate: string;
  document?: string;
  email?: string;
  phone?: string;
  onboardingCompleted: boolean;
}

export type NotificationPreference = 'all' | 'alerts_only' | 'transactions_only' | 'none';

export interface BankCard {
  id: string;
  bankName: string;
  packageName: string;
  lastFourDigits: string;
  wallpaperUri?: string;
  gradient: [string, string];
  accentColor: string;
  cardholderName: string;
  balance: number;
  limit: number;
  bankBalance?: number;
}

export type TransactionType = 'EXPENSE' | 'REFUND' | 'PIX_OUT' | 'PIX_IN' | 'INCOME' | 'TRANSFER';
export type IncomeType = 'salary' | 'extra' | 'investment_yield' | 'transfer_in' | 'other';

export interface Transaction {
  id: string;
  cardId: string;
  amount: number; // Centavos
  type: TransactionType;
  merchant: string;
  categoryId: string;
  timestamp: number;
  rawText?: string;
  incomeType?: IncomeType;
}

export type CategoryPilar = 'essential' | 'lifestyle' | 'investment';
export type CategoryType = 'expense' | 'income';

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  budgetLimit: number; // Centavos (aplicável a categorias de despesa)
  considerar?: boolean;
  isInvestimento?: boolean;
  isSalario?: boolean; // Mantido para retrocompatibilidade
  type?: CategoryType; // 'expense' | 'income' (padrão: 'expense')
  incomeType?: IncomeType; // 'salary' | 'extra' | 'investment_yield' | 'transfer_in' | 'other'
  pilar?: CategoryPilar;
}

export interface MonthClosingRecord {
  monthKey: string; // "YYYY-MM"
  monthLabel: string; // Ex: "Outubro/2026"
  closedAt: number; // Timestamp registrado (23:59 do último dia ou data da virada)
  accountBalance: number; // Saldo em conta até 23:59 (centavos)
  netSurplus: number; // Sobra líquida (receitas - despesas) em centavos
  totalIncome: number; // Total de receitas no mês (centavos)
  totalExpense: number; // Total de despesas consideradas no mês (centavos)
  salaryAmount: number; // Salário real apurado das categorias isSalario (centavos)
  savingsRate: number; // Percentual da sobra em relação à receita/salário
  isClosed: boolean; // Se o mês já encerrou ou se está em andamento
}

export interface SmartAlert {
  id: string;
  categoryName: string;
  percent: number;
  spent: number;
  limit: number;
  timestamp: number;
}

export type InvestmentType =
  | 'CDB'
  | 'LCI'
  | 'LCA'
  | 'Tesouro Direto'
  | 'Ações'
  | 'FII'
  | 'ETF'
  | 'Cripto'
  | 'Outro';

export interface Investment {
  id: string;
  name: string;
  type: InvestmentType;
  institution: string;
  /** Valor atual em centavos */
  currentValue: number;
  /** Valor inicial aplicado em centavos */
  initialValue: number;
  purchaseDate: string; // ISO date string
  maturityDate?: string;
  /** Taxa anual bruta (ex: 0.1250 = 12.50% a.a.) */
  annualRate?: number;
  color: string;
}
