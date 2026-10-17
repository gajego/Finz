import { create } from 'zustand';
import { UserProfile, BankCard, Transaction, Category } from '@/types';

interface WalletState {
  profile: UserProfile;
  cards: BankCard[];
  transactions: Transaction[];
  categories: Category[];
  activeCardIndex: number;
  privacyMode: boolean;
  
  // Ações
  setProfile: (profile: Partial<UserProfile>) => void;
  setActiveCardIndex: (index: number) => void;
  togglePrivacyMode: () => void;
  updateCardSkin: (cardId: string, wallpaperUri: string | undefined, gradient: [string, string]) => void;
  addTransaction: (tx: Omit<Transaction, 'id' | 'timestamp'>) => void;
}

const DEFAULT_CATEGORIES: Category[] = [
  { id: 'cat_food', name: 'Alimentação', icon: 'utensils', color: '#FF7A00', budgetLimit: 120000 },
  { id: 'cat_transport', name: 'Transporte', icon: 'car', color: '#00F0FF', budgetLimit: 45000 },
  { id: 'cat_leisure', name: 'Lazer & Setup', icon: 'gamepad-2', color: '#A855F7', budgetLimit: 60000 },
  { id: 'cat_shopping', name: 'Investimentos', icon: 'trending-up', color: '#D9F920', budgetLimit: 150000 },
];

const INITIAL_CARDS: BankCard[] = [
  {
    id: 'card_black',
    bankName: 'NUBANK ULTRAVIOLETA',
    packageName: 'com.nu.production',
    lastFourDigits: '9042',
    gradient: ['#0A0A0C', '#121217'],
    wallpaperUri: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1000&auto=format&fit=crop&q=80',
    accentColor: '#D9F920',
    cardholderName: 'WESLEY SILVA',
    balance: 842050,
    limit: 2500000,
  },
  {
    id: 'card_titanium',
    bankName: 'INTER BLACK TITANIUM',
    packageName: 'br.com.intermedium',
    lastFourDigits: '3194',
    gradient: ['#1A1C20', '#0E0F12'],
    wallpaperUri: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=1000&auto=format&fit=crop&q=80',
    accentColor: '#FF7A00',
    cardholderName: 'WESLEY SILVA',
    balance: 419000,
    limit: 1200000,
  },
  {
    id: 'card_itau',
    bankName: 'ITAÚ PRIVATE BANK',
    packageName: 'com.itau',
    lastFourDigits: '7721',
    gradient: ['#0F141C', '#05070A'],
    wallpaperUri: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=1000&auto=format&fit=crop&q=80',
    accentColor: '#E2E8F0',
    cardholderName: 'WESLEY SILVA',
    balance: 1520000,
    limit: 5000000,
  },
];

const INITIAL_TRANSACTIONS: Transaction[] = [
  {
    id: 'tx_1',
    cardId: 'card_black',
    amount: 14990,
    type: 'EXPENSE',
    merchant: 'Apple Services (iCloud & Music)',
    categoryId: 'cat_shopping',
    timestamp: Date.now() - 1000 * 60 * 18,
  },
  {
    id: 'tx_2',
    cardId: 'card_black',
    amount: 8750,
    type: 'EXPENSE',
    merchant: 'Pobre Juan Steakhouse',
    categoryId: 'cat_food',
    timestamp: Date.now() - 1000 * 60 * 60 * 3,
  },
  {
    id: 'tx_3',
    cardId: 'card_titanium',
    amount: 4200,
    type: 'REFUND',
    merchant: 'Posto Petrobras (Estorno Duplicado)',
    categoryId: 'cat_transport',
    timestamp: Date.now() - 1000 * 60 * 60 * 22,
  },
  {
    id: 'tx_4',
    cardId: 'card_itau',
    amount: 320000,
    type: 'EXPENSE',
    merchant: 'Aporte Tesouro Selic 2029',
    categoryId: 'cat_shopping',
    timestamp: Date.now() - 1000 * 60 * 60 * 48,
  },
];

export const useWalletStore = create<WalletState>((set) => ({
  profile: {
    id: 'usr_default',
    nickname: 'Wesley',
    fullName: 'Wesley Silva',
    birthDate: '1998-06-15',
    onboardingCompleted: true,
  },
  cards: INITIAL_CARDS,
  transactions: INITIAL_TRANSACTIONS,
  categories: DEFAULT_CATEGORIES,
  activeCardIndex: 0,
  privacyMode: false,

  setProfile: (data) =>
    set((state) => ({
      profile: { ...state.profile, ...data },
    })),

  setActiveCardIndex: (index) => set({ activeCardIndex: index }),

  togglePrivacyMode: () => set((state) => ({ privacyMode: !state.privacyMode })),

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
