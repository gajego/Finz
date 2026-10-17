import { create } from 'zustand';
import { UserProfile, BankCard, Transaction, Category } from '@/types';

interface WalletState {
  profile: UserProfile;
  cards: BankCard[];
  transactions: Transaction[];
  categories: Category[];
  activeCardIndex: number;
  
  // Ações
  setProfile: (profile: Partial<UserProfile>) => void;
  setActiveCardIndex: (index: number) => void;
  updateCardSkin: (cardId: string, wallpaperUri: string | undefined, gradient: [string, string]) => void;
  addTransaction: (tx: Omit<Transaction, 'id' | 'timestamp'>) => void;
}

const DEFAULT_CATEGORIES: Category[] = [
  { id: 'cat_food', name: 'Alimentação', icon: 'utensils', color: '#F59E0B', budgetLimit: 90000 },
  { id: 'cat_transport', name: 'Transporte', icon: 'car', color: '#38BDF8', budgetLimit: 40000 },
  { id: 'cat_leisure', name: 'Lazer', icon: 'gamepad-2', color: '#A855F7', budgetLimit: 35000 },
  { id: 'cat_health', name: 'Saúde', icon: 'heart-pulse', color: '#EF4444', budgetLimit: 25000 },
  { id: 'cat_shopping', name: 'Compras', icon: 'shopping-bag', color: '#00F59B', budgetLimit: 50000 },
];

const INITIAL_CARDS: BankCard[] = [
  {
    id: 'card_nu',
    bankName: 'Nubank',
    packageName: 'com.nu.production',
    lastFourDigits: '8492',
    gradient: ['#820AD1', '#4C0677'],
    accentColor: '#820AD1',
    cardholderName: 'WESLEY SILVA',
    balance: 428050,
    limit: 850000,
  },
  {
    id: 'card_itau',
    bankName: 'Itaú Personalité',
    packageName: 'com.itau',
    lastFourDigits: '1920',
    gradient: ['#EC7000', '#1C1917'],
    accentColor: '#EC7000',
    cardholderName: 'WESLEY SILVA',
    balance: 1250000,
    limit: 2500000,
  },
  {
    id: 'card_inter',
    bankName: 'Banco Inter',
    packageName: 'br.com.intermedium',
    lastFourDigits: '4410',
    gradient: ['#FF7A00', '#D95A00'],
    accentColor: '#FF7A00',
    cardholderName: 'WESLEY SILVA',
    balance: 312000,
    limit: 600000,
  },
];

const INITIAL_TRANSACTIONS: Transaction[] = [
  {
    id: 'tx_1',
    cardId: 'card_nu',
    amount: 5490,
    type: 'EXPENSE',
    merchant: 'iFood Brasil',
    categoryId: 'cat_food',
    timestamp: Date.now() - 1000 * 60 * 35, // 35 min atrás
  },
  {
    id: 'tx_2',
    cardId: 'card_itau',
    amount: 18000,
    type: 'EXPENSE',
    merchant: 'Posto Shell Ipiranga',
    categoryId: 'cat_transport',
    timestamp: Date.now() - 1000 * 60 * 60 * 4, // 4h atrás
  },
  {
    id: 'tx_3',
    cardId: 'card_nu',
    amount: 8990,
    type: 'EXPENSE',
    merchant: 'Steam Games',
    categoryId: 'cat_leisure',
    timestamp: Date.now() - 1000 * 60 * 60 * 24, // Ontem
  },
  {
    id: 'tx_4',
    cardId: 'card_inter',
    amount: 3200,
    type: 'REFUND',
    merchant: 'Farmácia Pague Menos (Estorno)',
    categoryId: 'cat_health',
    timestamp: Date.now() - 1000 * 60 * 60 * 36,
  },
];

export const useWalletStore = create<WalletState>((set) => ({
  profile: {
    id: 'usr_default',
    nickname: '',
    fullName: '',
    birthDate: '',
    onboardingCompleted: false,
  },
  cards: INITIAL_CARDS,
  transactions: INITIAL_TRANSACTIONS,
  categories: DEFAULT_CATEGORIES,
  activeCardIndex: 0,

  setProfile: (data) =>
    set((state) => ({
      profile: { ...state.profile, ...data },
    })),

  setActiveCardIndex: (index) => set({ activeCardIndex: index }),

  updateCardSkin: (cardId, wallpaperUri, gradient) =>
    set((state) => ({
      cards: state.cards.map((c) =>
        c.id === cardId ? { ...c, wallpaperUri, gradient } : c
      ),
    })),

  addTransaction: (tx) =>
    set((state) => ({
      transactions: [
        {
          ...tx,
          id: `tx_${Date.now()}`,
          timestamp: Date.now(),
        },
        ...state.transactions,
      ],
    })),
}));
