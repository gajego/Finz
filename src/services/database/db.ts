import * as SQLite from 'expo-sqlite';
import { BankCard, Category, Transaction, UserProfile } from '@/types';

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
      limit_cents INTEGER NOT NULL,
      bank_balance INTEGER DEFAULT 0
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

    CREATE INDEX IF NOT EXISTS idx_transactions_timestamp ON transactions (timestamp DESC);
    CREATE INDEX IF NOT EXISTS idx_transactions_card_id ON transactions (card_id);

    CREATE TABLE IF NOT EXISTS system_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  // Migração segura para colunas adicionadas posteriormente
  try {
    db.execSync('ALTER TABLE cards ADD COLUMN bank_balance INTEGER DEFAULT 0;');
  } catch {
    // Coluna já existe
  }

  // Higienização de cartões legados com nome genérico 'PLUGGY'
  try {
    db.runSync(`
      UPDATE cards 
      SET bank_name = 'NUBANK' 
      WHERE UPPER(bank_name) = 'PLUGGY' 
         OR UPPER(bank_name) = 'PLUGGY BANK' 
         OR UPPER(bank_name) = 'BANCO CONECTADO';
    `);
  } catch {
    // Tabela ainda vazia ou migrada
  }

  // Tabela para sobrescrita manual de categoria por transação (persistência leve e definitiva)
  db.execSync(`
    CREATE TABLE IF NOT EXISTS transaction_category_overrides (
      transaction_id TEXT PRIMARY KEY,
      category_id TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);

  // Normalização e sincronização de categorias canônicas (fix schema e nomenclaturas)
  try {
    db.runSync(`
      UPDATE categories SET name = 'Compras', icon = 'shopping-bag', color = '#8B5CF6' WHERE id = 'cat_shopping';
      UPDATE categories SET name = 'Alimentação', icon = 'utensils', color = '#F59E0B' WHERE id = 'cat_food';
      UPDATE categories SET name = 'Transporte', icon = 'car', color = '#3B82F6' WHERE id = 'cat_transport';
      UPDATE categories SET name = 'Lazer', icon = 'gamepad-2', color = '#EC4899' WHERE id = 'cat_leisure';
      INSERT OR IGNORE INTO categories (id, name, icon, color, budget_limit) VALUES ('cat_investments', 'Investimentos', 'trending-up', '#10B981', 0);
      INSERT OR IGNORE INTO categories (id, name, icon, color, budget_limit) VALUES ('cat_others', 'Não categorizado', 'help-circle', '#64748B', 0);
    `);
  } catch (e) {
    console.warn('[db] Falha ao sincronizar categorias canônicas:', e);
  }

  // Purgar mocks antigos e inicializar banco limpo
  purgeMockDataIfPresent();
  checkAndExecuteMonthlyTurnover();
  seedDefaultCategories();
}

/**
 * Purgar dados de mock se ainda existirem das versões de teste
 */
function purgeMockDataIfPresent() {
  const isPurged = db.getFirstSync<{ value: string }>(
    'SELECT value FROM system_meta WHERE key = ?',
    ['mocks_purged_v1']
  );

  if (!isPurged) {
    db.runSync('DELETE FROM transactions');
    db.runSync('DELETE FROM cards');
    db.runSync('INSERT OR REPLACE INTO system_meta (key, value) VALUES (?, ?)', [
      'mocks_purged_v1',
      'true',
    ]);
  }
}

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
    db.runSync(
      'INSERT OR REPLACE INTO system_meta (key, value) VALUES (?, ?)',
      [`closed_month_${row.value}`, JSON.stringify({ closedAt: Date.now() })]
    );

    db.runSync(
      'UPDATE system_meta SET value = ? WHERE key = ?',
      [currentMonthKey, 'last_active_month']
    );
  }
}

/**
 * Inicializa as categorias canônicas do Finz
 */
function seedDefaultCategories() {
  const catCount = db.getFirstSync<{ count: number }>('SELECT count(*) as count FROM categories');
  if (catCount && catCount.count >= 6) return;

  const initialCategories = [
    { id: 'cat_food', name: 'Alimentação', icon: 'utensils', color: '#F59E0B', budget_limit: 0 },
    { id: 'cat_transport', name: 'Transporte', icon: 'car', color: '#3B82F6', budget_limit: 0 },
    { id: 'cat_leisure', name: 'Lazer', icon: 'gamepad-2', color: '#EC4899', budget_limit: 0 },
    { id: 'cat_shopping', name: 'Compras', icon: 'shopping-bag', color: '#8B5CF6', budget_limit: 0 },
    { id: 'cat_investments', name: 'Investimentos', icon: 'trending-up', color: '#10B981', budget_limit: 0 },
    { id: 'cat_others', name: 'Não categorizado', icon: 'help-circle', color: '#64748B', budget_limit: 0 },
  ];

  for (const cat of initialCategories) {
    db.runSync(
      'INSERT OR REPLACE INTO categories (id, name, icon, color, budget_limit) VALUES (?, ?, ?, ?, ?)',
      [cat.id, cat.name, cat.icon, cat.color, cat.budget_limit]
    );
  }
}

export function loadAllDataFromSQLite(): {
  cards: BankCard[];
  categories: Category[];
  transactions: Transaction[];
  profile?: UserProfile;
} {
  const cardRows = db.getAllSync<any>('SELECT * FROM cards');
  const catRows = db.getAllSync<any>('SELECT * FROM categories');
  const txRows = db.getAllSync<any>(`
    SELECT 
      t.id, 
      t.card_id, 
      t.amount, 
      t.type, 
      t.merchant, 
      COALESCE(o.category_id, t.category_id, 'cat_others') AS category_id, 
      t.timestamp, 
      t.raw_text 
    FROM transactions t
    LEFT JOIN transaction_category_overrides o ON t.id = o.transaction_id
    ORDER BY t.timestamp DESC
  `);

  const cards: BankCard[] = cardRows.map((r) => ({
    id: String(r.id),
    bankName: String(r.bank_name || 'BANCO'),
    packageName: String(r.package_name || 'com.finz.openfinance'),
    lastFourDigits: String(r.last_four || '0000'),
    gradient: [String(r.gradient_0 || '#27272A'), String(r.gradient_1 || '#09090B')],
    wallpaperUri: r.wallpaper_uri || undefined,
    accentColor: String(r.accent_color || '#84CC16'),
    cardholderName: String(r.cardholder_name || 'MEU CARTAO'),
    balance: Number(r.balance) || 0,
    limit: Number(r.limit_cents) || 0,
    bankBalance: Number(r.bank_balance) || 0,
  }));

  const categories: Category[] = catRows.map((r) => ({
    id: String(r.id),
    name: String(r.name),
    icon: String(r.icon),
    color: String(r.color),
    budgetLimit: Number(r.budget_limit) || 0,
  }));

  const transactions: Transaction[] = txRows.map((r) => ({
    id: String(r.id),
    cardId: String(r.card_id),
    amount: Number(r.amount) || 0,
    type: r.type,
    merchant: String(r.merchant || 'Transação'),
    categoryId: String(r.category_id || 'cat_food'),
    timestamp: Number(r.timestamp) || 0,
    rawText: r.raw_text || undefined,
  }));

  let profile: UserProfile | undefined = undefined;
  const profileRow = db.getFirstSync<{ value: string }>(
    'SELECT value FROM system_meta WHERE key = ?',
    ['user_profile']
  );
  if (profileRow) {
    try {
      profile = JSON.parse(profileRow.value);
    } catch {}
  }

  return { cards, categories, transactions, profile };
}

export function persistProfile(profile: UserProfile) {
  db.runSync(
    'INSERT OR REPLACE INTO system_meta (key, value) VALUES (?, ?)',
    ['user_profile', JSON.stringify(profile)]
  );
}

export function persistCard(card: BankCard) {
  db.runSync(
    `INSERT OR REPLACE INTO cards (id, bank_name, package_name, last_four, gradient_0, gradient_1, wallpaper_uri, accent_color, cardholder_name, balance, limit_cents, bank_balance)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      card.id,
      card.bankName,
      card.packageName,
      card.lastFourDigits,
      card.gradient[0],
      card.gradient[1],
      card.wallpaperUri || null,
      card.accentColor,
      card.cardholderName,
      card.balance,
      card.limit,
      card.bankBalance || 0,
    ]
  );
}

export function persistCardBankBalance(cardId: string, bankBalanceCents: number) {
  db.runSync(
    'UPDATE cards SET bank_balance = ? WHERE id = ?',
    [bankBalanceCents, cardId]
  );
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
    'INSERT OR REPLACE INTO transactions (id, card_id, amount, type, merchant, category_id, timestamp, raw_text) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [tx.id, tx.cardId, tx.amount, tx.type, tx.merchant, tx.categoryId, tx.timestamp, tx.rawText || null]
  );
}

export function persistTransactionCategory(transactionId: string, categoryId: string) {
  try {
    db.runSync(
      'INSERT OR REPLACE INTO transaction_category_overrides (transaction_id, category_id, updated_at) VALUES (?, ?, ?)',
      [transactionId, categoryId, Date.now()]
    );
    db.runSync('UPDATE transactions SET category_id = ? WHERE id = ?', [categoryId, transactionId]);
  } catch (e) {
    console.warn('[db] Falha ao atualizar categoria da transação:', e);
  }
}

export function getTransactionCategoryOverrides(): Map<string, string> {
  const map = new Map<string, string>();
  try {
    const rows = db.getAllSync<{ transaction_id: string; category_id: string }>(
      'SELECT transaction_id, category_id FROM transaction_category_overrides'
    );
    for (const r of rows) {
      map.set(r.transaction_id, r.category_id);
    }
  } catch (e) {
    console.warn('[db] Falha ao obter overrides de categorias:', e);
  }
  return map;
}

export function persistThemeMode(mode: 'dark' | 'light') {
  try {
    db.runSync(
      'INSERT OR REPLACE INTO system_meta (key, value) VALUES (?, ?)',
      ['theme_mode', mode]
    );
  } catch (e) {
    console.warn('[db] Falha ao persistir tema:', e);
  }
}

export function loadThemeMode(): 'dark' | 'light' | null {
  try {
    db.execSync('CREATE TABLE IF NOT EXISTS system_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);');
    const row = db.getFirstSync<{ value: string }>(
      'SELECT value FROM system_meta WHERE key = ?',
      ['theme_mode']
    );
    if (row?.value === 'dark' || row?.value === 'light') {
      return row.value;
    }
    return null;
  } catch {
    return null;
  }
}

