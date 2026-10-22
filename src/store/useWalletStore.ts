import { create } from 'zustand';
import { UserProfile, BankCard, Transaction, Category, SmartAlert } from '@/types';
import {
  db,
  initDatabase,
  loadAllDataFromSQLite,
  persistCard,
  persistCardSkin,
  persistCardBankBalance,
  persistCategoryBudget,
  persistCategory,
  deleteCategory,
  persistTransaction,
  persistTransactionCategory,
  persistProfile,
} from '@/services/database/db';
import { notifyBalanceChange } from '@/services/notifications/notificationService';

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
  reloadFromSQLite: () => void;
  setProfile: (profile: Partial<UserProfile>) => void;
  setActiveCardIndex: (index: number) => void;
  togglePrivacyMode: () => void;
  addCard: (card: Omit<BankCard, 'id'>) => void;
  updateCardSkin: (cardId: string, wallpaperUri: string | undefined, gradient: [string, string]) => void;
  updateCardBankBalance: (cardId: string, bankBalance: number) => void;
  updateCategoryBudget: (categoryId: string, newLimitInCents: number) => void;
  createCategory: (cat: Omit<Category, 'id'>) => Category;
  updateCategory: (id: string, updates: Partial<Omit<Category, 'id'>>) => void;
  deleteCategory: (id: string) => void;
  updateTransactionCategory: (transactionId: string, newCategoryId: string) => void;
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
      // Migração segura para a tabela cards
      try {
        db.execSync('ALTER TABLE cards ADD COLUMN bank_balance INTEGER DEFAULT 0;');
      } catch {
        // Coluna já existe
      }
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

  reloadFromSQLite: () => {
    try {
      const data = loadAllDataFromSQLite();
      set({
        cards: data.cards,
        categories: data.categories,
        transactions: data.transactions,
        ...(data.profile ? { profile: data.profile } : {}),
      });
    } catch (e) {
      console.error('Falha ao recarregar SQLite:', e);
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
      id: `card_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
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

  updateCardBankBalance: (cardId, bankBalance) => {
    const card = get().cards.find((c) => c.id === cardId);
    const oldBalance = card?.bankBalance;
    persistCardBankBalance(cardId, bankBalance);
    set((state) => ({
      cards: state.cards.map((c) =>
        c.id === cardId ? { ...c, bankBalance } : c
      ),
    }));
    if (card && oldBalance !== undefined && oldBalance !== bankBalance) {
      notifyBalanceChange(card.bankName, oldBalance, bankBalance);
    }
  },

  updateCategoryBudget: (categoryId, newLimitInCents) => {
    persistCategoryBudget(categoryId, newLimitInCents);
    set((state) => ({
      categories: state.categories.map((c) =>
        c.id === categoryId ? { ...c, budgetLimit: newLimitInCents } : c
      ),
    }));
  },

  createCategory: (catData) => {
    const newCat: Category = {
      ...catData,
      id: `cat_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      budgetLimit: catData.budgetLimit ?? 0,
    };
    persistCategory(newCat);
    set((state) => ({
      categories: [...state.categories, newCat],
    }));
    return newCat;
  },

  updateCategory: (id, updates) => {
    if (id === 'cat_others') {
      console.warn('[store] A categoria Não categorizado é protegida contra edições.');
      return;
    }
    const state = get();
    const existing = state.categories.find((c) => c.id === id);
    if (!existing) return;
    const updated: Category = { ...existing, ...updates };
    persistCategory(updated);
    set((s) => ({
      categories: s.categories.map((c) => (c.id === id ? updated : c)),
    }));
  },

  deleteCategory: (id) => {
    if (id === 'cat_others') {
      console.warn('[store] A categoria Não categorizado não pode ser excluída.');
      return;
    }
    deleteCategory(id);
    set((state) => ({
      categories: state.categories.filter((c) => c.id !== id),
      transactions: state.transactions.map((tx) =>
        tx.categoryId === id ? { ...tx, categoryId: 'cat_others' } : tx
      ),
    }));
  },

  updateTransactionCategory: (transactionId, newCategoryId) => {
    persistTransactionCategory(transactionId, newCategoryId);
    set((state) => ({
      transactions: state.transactions.map((tx) =>
        tx.id === transactionId ? { ...tx, categoryId: newCategoryId } : tx
      ),
    }));
  },

  addTransaction: (tx) => {
    const state = get();
    const newTx: Transaction = {
      ...tx,
      id: `tx_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      timestamp: Date.now(),
    };

    persistTransaction(newTx);

    const updatedTransactions = [newTx, ...state.transactions];

    let triggeredAlert: SmartAlert | null = null;
    if (tx.type === 'EXPENSE') {
      const category = state.categories.find((c) => c.id === tx.categoryId);
      if (category && category.budgetLimit > 0) {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
        const totalSpent = updatedTransactions
          .filter(
            (t) =>
              t.categoryId === category.id &&
              t.type === 'EXPENSE' &&
              t.timestamp >= startOfMonth
          )
          .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

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
