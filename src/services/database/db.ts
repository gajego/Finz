import * as SQLite from 'expo-sqlite';
import { BankCard, Category, Transaction } from '@/types';

const DB_NAME = 'finz.db';

export const db = SQLite.openDatabaseSync(DB_NAME);

export function initDatabase() {
  db.execSync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS cards (
      id TEXT PRIMARY KEY,
      bank_name TEXT NOT NULL,
      package_name TEXT NOT NULL,
      last_four TEXT NOT NULL,
      gradient_0 TEXT NOT NULL,
      gradient_1 TEXT NOT NULL,
      wallpaper_uri TEXT,
      accent_color TEXT NOT NULL,
      cardholder_name TEXT NOT NULL,
      balance INTEGER NOT NULL,
      limit_cents INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      icon TEXT NOT NULL,
      color TEXT NOT NULL,
      budget_limit INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      card_id TEXT NOT NULL,
      amount INTEGER NOT NULL,
      type TEXT NOT NULL,
      merchant TEXT NOT NULL,
      category_id TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      raw_text TEXT
    );

    CREATE TABLE IF NOT EXISTS system_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  // Automação: Virada de Mês Inteligente
  checkAndExecuteMonthlyTurnover();
  seedIfEmpty();
}

/**
 * Automação de Virada de Mês:
 * Compara o mês atual (ex: "2026-10") com a última virada registrada.
 * Se o mês mudou, registra o fechamento do mês anterior e atualiza o ciclo.
 */
function checkAndExecuteMonthlyTurnover() {
  const currentMonthKey = new Date().toISOString().slice(0, 7); // "YYYY-MM"
  const row = db.getFirstSync<{ value: string }>(
    'SELECT value FROM system_meta WHERE key = ?',
    ['last_active_month']
  );

  if (!row) {
    db.runSync(
      'INSERT INTO system_meta (key, value) VALUES (?, ?)',
      ['last_active_month', currentMonthKey]
    );
  } else if (row.value !== currentMonthKey) {
    // Virada de Mês Detectada!
    // Salva marco de fechamento do mês anterior
    db.runSync(
      'INSERT OR REPLACE INTO system_meta (key, value) VALUES (?, ?)',
      [`closed_month_${row.value}`, JSON.stringify({ closedAt: Date.now() })]
    );

    // Atualiza para o novo mês ativo
    db.runSync(
      'UPDATE system_meta SET value = ? WHERE key = ?',
      [currentMonthKey, 'last_active_month']
    );
  }
}

function seedIfEmpty() {
  const cardCount = db.getFirstSync<{ count: number }>('SELECT count(*) as count FROM cards');
  if (cardCount && cardCount.count > 0) return;

  // Inserir cartões padrão
  const initialCards = [
    {
      id: 'card_black',
      bank_name: 'NUBANK ULTRAVIOLETA',
      package_name: 'com.nu.production',
      last_four: '9042',
      gradient_0: '#0A0A0C',
      gradient_1: '#121217',
      wallpaper_uri: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1000&auto=format&fit=crop&q=80',
      accent_color: '#D9F920',
      cardholder_name: 'WESLEY SILVA',
      balance: 842050,
      limit_cents: 2500000,
    },
    {
      id: 'card_titanium',
      bank_name: 'INTER BLACK TITANIUM',
      package_name: 'br.com.intermedium',
      last_four: '3194',
      gradient_0: '#1A1C20',
      gradient_1: '#0E0F12',
      wallpaper_uri: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=1000&auto=format&fit=crop&q=80',
      accent_color: '#FF7A00',
      cardholder_name: 'WESLEY SILVA',
      balance: 419000,
      limit_cents: 1200000,
    },
    {
      id: 'card_itau',
      bank_name: 'ITAÚ PRIVATE BANK',
      package_name: 'com.itau',
      last_four: '7721',
      gradient_0: '#0F141C',
      gradient_1: '#05070A',
      wallpaper_uri: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=1000&auto=format&fit=crop&q=80',
      accent_color: '#E2E8F0',
      cardholder_name: 'WESLEY SILVA',
      balance: 1520000,
      limit_cents: 5000000,
    },
  ];

  for (const c of initialCards) {
    db.runSync(
      `INSERT INTO cards (id, bank_name, package_name, last_four, gradient_0, gradient_1, wallpaper_uri, accent_color, cardholder_name, balance, limit_cents)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [c.id, c.bank_name, c.package_name, c.last_four, c.gradient_0, c.gradient_1, c.wallpaper_uri, c.accent_color, c.cardholder_name, c.balance, c.limit_cents]
    );
  }

  // Inserir categorias padrão
  const initialCategories = [
    { id: 'cat_food', name: 'Alimentação', icon: 'utensils', color: '#FF7A00', budget_limit: 120000 },
    { id: 'cat_transport', name: 'Transporte', icon: 'car', color: '#00F0FF', budget_limit: 45000 },
    { id: 'cat_leisure', name: 'Lazer & Setup', icon: 'gamepad-2', color: '#A855F7', budget_limit: 60000 },
    { id: 'cat_shopping', name: 'Investimentos', icon: 'trending-up', color: '#D9F920', budget_limit: 150000 },
  ];

  for (const cat of initialCategories) {
    db.runSync(
      'INSERT INTO categories (id, name, icon, color, budget_limit) VALUES (?, ?, ?, ?, ?)',
      [cat.id, cat.name, cat.icon, cat.color, cat.budget_limit]
    );
  }

  // Inserir transações padrão
  const initialTxs = [
    {
      id: 'tx_1',
      card_id: 'card_black',
      amount: 14990,
      type: 'EXPENSE',
      merchant: 'Apple Services (iCloud & Music)',
      category_id: 'cat_shopping',
      timestamp: Date.now() - 1000 * 60 * 18,
    },
    {
      id: 'tx_2',
      card_id: 'card_black',
      amount: 8750,
      type: 'EXPENSE',
      merchant: 'Pobre Juan Steakhouse',
      category_id: 'cat_food',
      timestamp: Date.now() - 1000 * 60 * 60 * 3,
    },
    {
      id: 'tx_3',
      card_id: 'card_titanium',
      amount: 4200,
      type: 'REFUND',
      merchant: 'Posto Petrobras (Estorno Duplicado)',
      category_id: 'cat_transport',
      timestamp: Date.now() - 1000 * 60 * 60 * 22,
    },
    {
      id: 'tx_4',
      card_id: 'card_itau',
      amount: 320000,
      type: 'EXPENSE',
      merchant: 'Aporte Tesouro Selic 2029',
      category_id: 'cat_shopping',
      timestamp: Date.now() - 1000 * 60 * 60 * 48,
    },
  ];

  for (const t of initialTxs) {
    db.runSync(
      'INSERT INTO transactions (id, card_id, amount, type, merchant, category_id, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [t.id, t.card_id, t.amount, t.type, t.merchant, t.category_id, t.timestamp]
    );
  }
}

export function loadAllDataFromSQLite(): {
  cards: BankCard[];
  categories: Category[];
  transactions: Transaction[];
} {
  const cardRows = db.getAllSync<any>('SELECT * FROM cards');
  const catRows = db.getAllSync<any>('SELECT * FROM categories');
  const txRows = db.getAllSync<any>('SELECT * FROM transactions ORDER BY timestamp DESC');

  const cards: BankCard[] = cardRows.map((r) => ({
    id: r.id,
    bankName: r.bank_name,
    packageName: r.package_name,
    lastFourDigits: r.last_four,
    gradient: [r.gradient_0, r.gradient_1],
    wallpaperUri: r.wallpaper_uri || undefined,
    accentColor: r.accent_color,
    cardholderName: r.cardholder_name,
    balance: r.balance,
    limit: r.limit_cents,
  }));

  const categories: Category[] = catRows.map((r) => ({
    id: r.id,
    name: r.name,
    icon: r.icon,
    color: r.color,
    budgetLimit: r.budget_limit,
  }));

  const transactions: Transaction[] = txRows.map((r) => ({
    id: r.id,
    cardId: r.card_id,
    amount: r.amount,
    type: r.type,
    merchant: r.merchant,
    categoryId: r.category_id,
    timestamp: r.timestamp,
    rawText: r.raw_text,
  }));

  return { cards, categories, transactions };
}

export function persistCardSkin(cardId: string, wallpaperUri: string | undefined, gradient: [string, string]) {
  db.runSync(
    'UPDATE cards SET wallpaper_uri = ?, gradient_0 = ?, gradient_1 = ? WHERE id = ?',
    [wallpaperUri || null, gradient[0], gradient[1], cardId]
  );
}

export function persistCategoryBudget(categoryId: string, budgetLimitCents: number) {
  db.runSync(
    'UPDATE categories SET budget_limit = ? WHERE id = ?',
    [budgetLimitCents, categoryId]
  );
}

export function persistTransaction(tx: Transaction) {
  db.runSync(
    'INSERT INTO transactions (id, card_id, amount, type, merchant, category_id, timestamp, raw_text) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [tx.id, tx.cardId, tx.amount, tx.type, tx.merchant, tx.categoryId, tx.timestamp, tx.rawText || null]
  );
}
