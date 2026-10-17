import { create } from 'zustand';
import { UserProfile, BankCard, Transaction, Category, SmartAlert } from '@/types';
import {
  initDatabase,
  loadAllDataFromSQLite,
  persistCard,
  persistCardSkin,
  persistCategoryBudget,
  persistTransaction,
  persistProfile,
} from '@/services/database/db';

interface WalletState {
  profile: UserProfile;
  cards: BankCard[];
  transactions: Transaction[];
  categories: Category[];
  activeCardIndex: number;
  privacyMode: boolean;
  activeAlert: SmartAlert | null;
  isInitialized: boolean;
  
  // Ações
  initStore: () => void;
  setProfile: (profile: Partial<UserProfile>) => void;
  setActiveCardIndex: (index: number) => void;
  togglePrivacyMode: () => void;
  addCard: (card: Omit<BankCard, 'id'>) => void;
  updateCardSkin: (cardId: string, wallpaperUri: string | undefined, gradient: [string, string]) => void;
  updateCategoryBudget: (categoryId: string, newLimitInCents: number) => void;
  dismissAlert: () => void;
  addTransaction: (tx: Omit<Transaction, 'id' | 'timestamp'>) => void;
}

export const useWalletStore = create<WalletState>((set, get) => ({
  profile: {
    id: 'usr_default',
    nickname: '',
    fullName: '',
    birthDate: '',
    onboardingCompleted: false,
  },
  cards: [],
  transactions: [],
  categories: [],
  activeCardIndex: 0,
  privacyMode: false,
  activeAlert: null,
  isInitialized: false,

  initStore: () => {
    if (get().isInitialized) return;
    try {
      initDatabase();
      const data = loadAllDataFromSQLite();
      set({
        cards: data.cards,
        categories: data.categories,
        transactions: data.transactions,
        ...(data.profile ? { profile: data.profile } : {}),
        isInitialized: true,
      });
    } catch (e) {
      console.error('Falha ao inicializar SQLite:', e);
    }
  },

  setProfile: (data) =>
    set((state) => {
      const updatedProfile = { ...state.profile, ...data };
      persistProfile(updatedProfile);
      return { profile: updatedProfile };
    }),

  setActiveCardIndex: (index) => set({ activeCardIndex: index }),

  togglePrivacyMode: () => set((state) => ({ privacyMode: !state.privacyMode })),

  dismissAlert: () => set({ activeAlert: null }),

  addCard: (cardData) => {
    const newCard: BankCard = {
      ...cardData,
      id: `card_${Date.now()}`,
    };
    persistCard(newCard);
    set((state) => ({
      cards: [...state.cards, newCard],
      activeCardIndex: state.cards.length,
    }));
  },

  updateCardSkin: (cardId, wallpaperUri, gradient) => {
    persistCardSkin(cardId, wallpaperUri, gradient);
    set((state) => ({
      cards: state.cards.map((c) =>
        c.id === cardId ? { ...c, wallpaperUri, gradient } : c
      ),
    }));
  },

  updateCategoryBudget: (categoryId, newLimitInCents) => {
    persistCategoryBudget(categoryId, newLimitInCents);
    set((state) => ({
      categories: state.categories.map((c) =>
        c.id === categoryId ? { ...c, budgetLimit: newLimitInCents } : c
      ),
    }));
  },

  addTransaction: (tx) => {
    const state = get();
    const newTx: Transaction = {
      ...tx,
      id: `tx_${Date.now()}`,
      timestamp: Date.now(),
    };

    persistTransaction(newTx);

    const updatedTransactions = [newTx, ...state.transactions];

    let triggeredAlert: SmartAlert | null = null;
    if (tx.type === 'EXPENSE') {
      const category = state.categories.find((c) => c.id === tx.categoryId);
      if (category && category.budgetLimit > 0) {
        const totalSpent = updatedTransactions
          .filter((t) => t.categoryId === category.id && t.type === 'EXPENSE')
          .reduce((sum, t) => sum + t.amount, 0);

        const percent = Math.round((totalSpent / category.budgetLimit) * 100);

        if (percent >= 85) {
          triggeredAlert = {
            id: `alert_${Date.now()}`,
            categoryName: category.name,
            percent,
            spent: totalSpent,
            limit: category.budgetLimit,
            timestamp: Date.now(),
          };
        }
      }
    }

    set({
      transactions: updatedTransactions,
      activeAlert: triggeredAlert || state.activeAlert,
    });
  },
}));
