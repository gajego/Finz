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

export type TransactionType = 'EXPENSE' | 'REFUND' | 'PIX_OUT' | 'PIX_IN';

export interface Transaction {
  id: string;
  cardId: string;
  amount: number; // Centavos
  type: TransactionType;
  merchant: string;
  categoryId: string;
  timestamp: number;
  rawText?: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  budgetLimit: number; // Centavos
  considerar?: boolean;
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
