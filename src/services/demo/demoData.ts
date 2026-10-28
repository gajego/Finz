import { BankCard, Category, Transaction, UserProfile, Investment } from '@/types';

export const DEMO_PROFILE: UserProfile = {
  id: 'usr_demo_presentation',
  fullName: 'Lucas Silveira',
  nickname: 'Lucas',
  birthDate: '14/08/1995',
  document: '123.456.789-00',
  email: 'lucas.silveira@finz.app',
  phone: '(11) 98765-4321',
  onboardingCompleted: true,
};

export const DEMO_CARDS: BankCard[] = [
  {
    id: 'card_demo_nu',
    bankName: 'NUBANK',
    packageName: 'com.nu.production',
    lastFourDigits: '8924',
    cardholderName: 'LUCAS SILVEIRA',
    balance: 423580, // Fatura R$ 4.235,80
    limit: 1500000, // Limite R$ 15.000,00
    bankBalance: 1285040, // Saldo R$ 12.850,40
    gradient: ['#820AD1', '#4C0677'],
    accentColor: '#820AD1',
  },
  {
    id: 'card_demo_itau',
    bankName: 'ITAU',
    packageName: 'com.itau.personnalite',
    lastFourDigits: '4112',
    cardholderName: 'LUCAS SILVEIRA',
    balance: 215090, // Fatura R$ 2.150,90
    limit: 3000000, // Limite R$ 30.000,00
    bankBalance: 4892000, // Saldo R$ 48.920,00
    gradient: ['#EC7000', '#B34A00'],
    accentColor: '#EC7000',
  },
  {
    id: 'card_demo_inter',
    bankName: 'INTER',
    packageName: 'br.com.intermedium',
    lastFourDigits: '7730',
    cardholderName: 'LUCAS SILVEIRA',
    balance: 98040, // Fatura R$ 980,40
    limit: 1000000, // Limite R$ 10.000,00
    bankBalance: 641030, // Saldo R$ 6.410,30
    gradient: ['#FF7A00', '#D15B00'],
    accentColor: '#FF7A00',
  },
];

export const DEMO_INVESTMENTS: Investment[] = [
  {
    id: 'inv_demo_1',
    name: 'Tesouro Selic 2029',
    type: 'Tesouro Direto',
    institution: 'Tesouro Nacional',
    currentValue: 4589000, // R$ 45.890,00
    initialValue: 4200000,
    purchaseDate: '2023-04-10',
    maturityDate: '2029-03-01',
    annualRate: 0.1075,
    color: '#10B981',
  },
  {
    id: 'inv_demo_2',
    name: 'CDB Nubank 110% CDI',
    type: 'CDB',
    institution: 'Nubank',
    currentValue: 3240000, // R$ 32.400,00
    initialValue: 3000000,
    purchaseDate: '2024-01-15',
    annualRate: 0.1188,
    color: '#820AD1',
  },
  {
    id: 'inv_demo_3',
    name: 'KNRI11 - Kinea Renda',
    type: 'FII',
    institution: 'XP Investimentos',
    currentValue: 1875000, // R$ 18.750,00
    initialValue: 1750000,
    purchaseDate: '2023-09-05',
    color: '#F59E0B',
  },
  {
    id: 'inv_demo_4',
    name: 'IVVB11 - S&P 500 ETF',
    type: 'ETF',
    institution: 'BTG Pactual',
    currentValue: 2462000, // R$ 24.620,00
    initialValue: 2100000,
    purchaseDate: '2023-02-18',
    color: '#3B82F6',
  },
  {
    id: 'inv_demo_5',
    name: 'LCI Banco do Brasil 94% CDI',
    type: 'LCI',
    institution: 'Banco do Brasil',
    currentValue: 1500000, // R$ 15.000,00
    initialValue: 1450000,
    purchaseDate: '2024-06-01',
    maturityDate: '2025-06-01',
    annualRate: 0.0996,
    color: '#EAB308',
  },
];

const now = Date.now();
const DAY = 24 * 60 * 60 * 1000;

export const DEMO_TRANSACTIONS: Transaction[] = [
  {
    id: 'tx_demo_1',
    cardId: 'card_demo_nu',
    amount: 4990,
    type: 'EXPENSE',
    merchant: 'Apple Services (Apple One)',
    categoryId: 'cat_leisure',
    timestamp: now - 1 * 3600 * 1000,
  },
  {
    id: 'tx_demo_2',
    cardId: 'card_demo_nu',
    amount: 34280,
    type: 'EXPENSE',
    merchant: 'Pão de Açúcar Supermercado',
    categoryId: 'cat_food',
    timestamp: now - 5 * 3600 * 1000,
  },
  {
    id: 'tx_demo_3',
    cardId: 'card_demo_nu',
    amount: 3850,
    type: 'EXPENSE',
    merchant: 'Uber Viagem VIP',
    categoryId: 'cat_transport',
    timestamp: now - 12 * 3600 * 1000,
  },
  {
    id: 'tx_demo_4',
    cardId: 'card_demo_itau',
    amount: 150000,
    type: 'PIX_IN',
    merchant: 'Transferência Pix (Consultoria)',
    categoryId: 'cat_investments',
    timestamp: now - 1 * DAY,
  },
  {
    id: 'tx_demo_5',
    cardId: 'card_demo_itau',
    amount: 26000,
    type: 'EXPENSE',
    merchant: 'Restaurante Fogo de Chão',
    categoryId: 'cat_food',
    timestamp: now - 1 * DAY - 4 * 3600 * 1000,
  },
  {
    id: 'tx_demo_6',
    cardId: 'card_demo_nu',
    amount: 12990,
    type: 'EXPENSE',
    merchant: 'Smart Fit Mensalidade',
    categoryId: 'cat_leisure',
    timestamp: now - 2 * DAY,
  },
  {
    id: 'tx_demo_7',
    cardId: 'card_demo_inter',
    amount: 22000,
    type: 'EXPENSE',
    merchant: 'Posto Ipiranga Combustível',
    categoryId: 'cat_transport',
    timestamp: now - 2 * DAY - 6 * 3600 * 1000,
  },
  {
    id: 'tx_demo_8',
    cardId: 'card_demo_nu',
    amount: 18900,
    type: 'EXPENSE',
    merchant: 'Mercado Livre Brasil',
    categoryId: 'cat_shopping',
    timestamp: now - 3 * DAY,
  },
  {
    id: 'tx_demo_9',
    cardId: 'card_demo_nu',
    amount: 1990,
    type: 'EXPENSE',
    merchant: 'Amazon Prime Assinatura',
    categoryId: 'cat_leisure',
    timestamp: now - 4 * DAY,
  },
  {
    id: 'tx_demo_10',
    cardId: 'card_demo_itau',
    amount: 8460,
    type: 'EXPENSE',
    merchant: 'Droga Raia Farmácia',
    categoryId: 'cat_others',
    timestamp: now - 5 * DAY,
  },
  {
    id: 'tx_demo_11',
    cardId: 'card_demo_nu',
    amount: 2850,
    type: 'EXPENSE',
    merchant: 'Starbucks Coffee',
    categoryId: 'cat_food',
    timestamp: now - 6 * DAY,
  },
];

export const DEMO_CATEGORIES: Category[] = [
  { id: 'cat_food', name: 'Alimentação', icon: 'utensils', color: '#F59E0B', budgetLimit: 250000, considerar: true, isInvestimento: false, pilar: 'essential' },
  { id: 'cat_transport', name: 'Transporte', icon: 'car', color: '#3B82F6', budgetLimit: 80000, considerar: true, isInvestimento: false, pilar: 'essential' },
  { id: 'cat_leisure', name: 'Lazer', icon: 'gamepad-2', color: '#EC4899', budgetLimit: 120000, considerar: true, isInvestimento: false, pilar: 'lifestyle' },
  { id: 'cat_shopping', name: 'Compras', icon: 'shopping-bag', color: '#8B5CF6', budgetLimit: 150000, considerar: true, isInvestimento: false, pilar: 'lifestyle' },
  { id: 'cat_investments', name: 'Investimentos', icon: 'trending-up', color: '#10B981', budgetLimit: 500000, considerar: true, isInvestimento: true, pilar: 'investment' },
  { id: 'cat_others', name: 'Não categorizado', icon: 'help-circle', color: '#64748B', budgetLimit: 0, considerar: true, isInvestimento: false, pilar: 'lifestyle' },
];
