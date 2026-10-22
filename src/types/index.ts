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
}

export interface SmartAlert {
  id: string;
  categoryName: string;
  percent: number;
  spent: number;
  limit: number;
  timestamp: number;
}
