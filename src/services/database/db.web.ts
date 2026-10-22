import { BankCard, Category, Transaction, UserProfile } from '@/types';

const STORAGE_KEY = 'finz_web_db_v1';

interface WebTables {
  cards: Record<string, any>;
  categories: Record<string, any>;
  transactions: Record<string, any>;
  system_meta: Record<string, string>;
}

function loadTables(): WebTables {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        return JSON.parse(raw);
      }
    }
  } catch {}

  return {
    cards: {},
    categories: {},
    transactions: {},
    system_meta: {},
  };
}

let tables: WebTables = loadTables();

function saveTables() {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tables));
    }
  } catch {}
}

/**
 * Driver simulado de SQLite para ambiente Web com persistência em localStorage
 */
export const db = {
  withTransactionSync(task: () => void) {
    task();
  },

  execSync(sql: string) {
    // No-op para comandos DDL em ambiente web
    return;
  },

  runSync(sql: string, params: any[] = []): { changes: number; lastInsertRowId: number } {
    const cleanSql = sql.trim();

    // 1. INSERT OR REPLACE INTO system_meta
    if (/INSERT\s+(OR\s+REPLACE\s+)?INTO\s+system_meta/i.test(cleanSql)) {
      const [key, value] = params;
      if (key) {
        tables.system_meta[key] = String(value);
        saveTables();
      }
      return { changes: 1, lastInsertRowId: 1 };
    }

    // 2. DELETE FROM system_meta WHERE key LIKE "pluggy_%"
    if (/DELETE\s+FROM\s+system_meta/i.test(cleanSql)) {
      if (/LIKE/i.test(cleanSql)) {
        Object.keys(tables.system_meta).forEach((k) => {
          if (k.startsWith('pluggy_')) delete tables.system_meta[k];
        });
      } else {
        tables.system_meta = {};
      }
      saveTables();
      return { changes: 1, lastInsertRowId: 0 };
    }

    // 3. UPDATE system_meta SET value = ? WHERE key = ?
    if (/UPDATE\s+system_meta/i.test(cleanSql)) {
      const [value, key] = params;
      if (key) {
        tables.system_meta[key] = String(value);
        saveTables();
      }
      return { changes: 1, lastInsertRowId: 0 };
    }

    // 4. INSERT OR REPLACE INTO cards
    if (/INSERT\s+(OR\s+REPLACE\s+)?INTO\s+cards/i.test(cleanSql)) {
      const [
        id,
        bank_name,
        package_name,
        last_four,
        gradient_0,
        gradient_1,
        wallpaper_uri,
        accent_color,
        cardholder_name,
        balance,
        limit_cents,
        bank_balance = 0,
      ] = params;

      tables.cards[id] = {
        id,
        bank_name,
        package_name,
        last_four,
        gradient_0,
        gradient_1,
        wallpaper_uri,
        accent_color,
        cardholder_name,
        balance: Number(balance) || 0,
        limit_cents: Number(limit_cents) || 0,
        bank_balance: Number(bank_balance) || 0,
      };
      saveTables();
      return { changes: 1, lastInsertRowId: 1 };
    }

    // 5. UPDATE cards
    if (/UPDATE\s+cards/i.test(cleanSql)) {
      if (/bank_balance/i.test(cleanSql)) {
        const [bank_balance, id] = params;
        if (tables.cards[id]) {
          tables.cards[id].bank_balance = Number(bank_balance) || 0;
          saveTables();
        }
      } else if (/wallpaper_uri/i.test(cleanSql)) {
        const [wallpaper_uri, gradient_0, gradient_1, id] = params;
        if (tables.cards[id]) {
          tables.cards[id].wallpaper_uri = wallpaper_uri;
          tables.cards[id].gradient_0 = gradient_0;
          tables.cards[id].gradient_1 = gradient_1;
          saveTables();
        }
      }
      return { changes: 1, lastInsertRowId: 0 };
    }

    // 6. DELETE FROM cards
    if (/DELETE\s+FROM\s+cards/i.test(cleanSql)) {
      tables.cards = {};
      saveTables();
      return { changes: 1, lastInsertRowId: 0 };
    }

    // 7. INSERT OR REPLACE INTO transactions
    if (/INSERT\s+(OR\s+REPLACE\s+)?INTO\s+transactions/i.test(cleanSql)) {
      const [id, card_id, amount, type, merchant, category_id, timestamp, raw_text] = params;
      tables.transactions[id] = {
        id,
        card_id,
        amount: Number(amount) || 0,
        type,
        merchant,
        category_id,
        timestamp: Number(timestamp) || Date.now(),
        raw_text,
      };
      saveTables();
      return { changes: 1, lastInsertRowId: 1 };
    }

    // 8. DELETE FROM transactions
    if (/DELETE\s+FROM\s+transactions/i.test(cleanSql)) {
      tables.transactions = {};
      saveTables();
      return { changes: 1, lastInsertRowId: 0 };
    }

    // 9. INSERT OR REPLACE INTO categories
    if (/INSERT\s+(OR\s+REPLACE\s+)?INTO\s+categories/i.test(cleanSql)) {
      const [id, name, icon, color, budget_limit] = params;
      tables.categories[id] = {
        id,
        name,
        icon,
        color,
        budget_limit: Number(budget_limit) || 0,
      };
      saveTables();
      return { changes: 1, lastInsertRowId: 1 };
    }

    // 10. UPDATE categories
    if (/UPDATE\s+categories/i.test(cleanSql)) {
      const [budget_limit, id] = params;
      if (tables.categories[id]) {
        tables.categories[id].budget_limit = Number(budget_limit) || 0;
        saveTables();
      }
      return { changes: 1, lastInsertRowId: 0 };
    }

    return { changes: 0, lastInsertRowId: 0 };
  },

  getFirstSync<T>(sql: string, params: any[] = []): T | null {
    const cleanSql = sql.trim();

    // 1. SELECT value FROM system_meta WHERE key = ?
    if (/SELECT\s+value\s+FROM\s+system_meta/i.test(cleanSql)) {
      const key = params[0];
      const val = tables.system_meta[key];
      return val !== undefined ? ({ value: val } as unknown as T) : null;
    }

    // 2. SELECT ... FROM cards WHERE id = ?
    if (/FROM\s+cards\s+WHERE\s+id\s*=\s*\?/i.test(cleanSql)) {
      const id = params[0];
      const card = tables.cards[id];
      return card ? (card as unknown as T) : null;
    }

    // 3. SELECT ... FROM transactions WHERE id = ?
    if (/FROM\s+transactions\s+WHERE\s+id\s*=\s*\?/i.test(cleanSql)) {
      const id = params[0];
      const tx = tables.transactions[id];
      return tx ? (tx as unknown as T) : null;
    }

    // 5. SELECT count(*) as count FROM categories
    if (/count\(\*\)/i.test(cleanSql) && /categories/i.test(cleanSql)) {
      const count = Object.keys(tables.categories).length;
      return { count } as unknown as T;
    }

    return null;
  },

  getAllSync<T>(sql: string): T[] {
    const cleanSql = sql.trim();

    // 1. SELECT * FROM cards
    if (/FROM\s+cards/i.test(cleanSql)) {
      return Object.values(tables.cards) as unknown as T[];
    }

    // 2. SELECT * FROM categories
    if (/FROM\s+categories/i.test(cleanSql)) {
      return Object.values(tables.categories) as unknown as T[];
    }

    // 3. SELECT * FROM transactions
    if (/FROM\s+transactions/i.test(cleanSql)) {
      return Object.values(tables.transactions).sort(
        (a: any, b: any) => (b.timestamp || 0) - (a.timestamp || 0)
      ) as unknown as T[];
    }

    return [];
  },
};

export function initDatabase() {
  // Purgar mocks antigos e inicializar banco limpo
  purgeMockDataIfPresent();
  checkAndExecuteMonthlyTurnover();
  seedDefaultCategories();

  // Normalização de categorias para integridade referencial com schema canônico
  try {
    Object.values(tables.transactions).forEach((tx) => {
      if (tx.category_id === 'cat_alimentacao' || tx.category_id === 'cat_outros') {
        tx.category_id = 'cat_food';
      } else if (tx.category_id === 'cat_transporte') {
        tx.category_id = 'cat_transport';
      } else if (tx.category_id === 'cat_lazer') {
        tx.category_id = 'cat_leisure';
      } else if (tx.category_id === 'cat_investimentos') {
        tx.category_id = 'cat_shopping';
      }
    });
    saveTables();
  } catch {}
}

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
  const currentMonthKey = new Date().toISOString().slice(0, 7);
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

  const cards: BankCard[] = cardRows.map((r) => {
    let bankName = String(r.bank_name || 'NUBANK');
    if (
      bankName.toUpperCase() === 'GOLD' ||
      bankName.toUpperCase() === 'PLUGGY' ||
      bankName.toUpperCase() === 'BANCO CONECTADO'
    ) {
      bankName = 'NUBANK';
    }

    return {
      id: String(r.id),
      bankName,
      packageName: String(r.package_name || 'com.nu.production'),
      lastFourDigits: String(r.last_four || '0000'),
      gradient: [String(r.gradient_0 || '#820AD1'), String(r.gradient_1 || '#4C0677')],
      wallpaperUri: r.wallpaper_uri || undefined,
      accentColor: String(r.accent_color || '#820AD1'),
      cardholderName: String(r.cardholder_name || 'MEU CARTAO'),
      balance: Number(r.balance) || 0,
      limit: Number(r.limit_cents) || 0,
      bankBalance: Number(r.bank_balance) || 0,
    };
  });

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
    `INSERT INTO cards (id, bank_name, package_name, last_four, gradient_0, gradient_1, wallpaper_uri, accent_color, cardholder_name, balance, limit_cents, bank_balance)
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

export function persistCategory(cat: Category) {
  try {
    db.runSync(
      'INSERT OR REPLACE INTO categories (id, name, icon, color, budget_limit) VALUES (?, ?, ?, ?, ?)',
      [cat.id, cat.name, cat.icon, cat.color, cat.budgetLimit]
    );
  } catch (e) {
    console.warn('[db.web] Falha ao persistir categoria:', e);
  }
}

export function deleteCategory(categoryId: string) {
  if (categoryId === 'cat_others') {
    console.warn('[db.web] A categoria Não categorizado é protegida e não pode ser excluída.');
    return;
  }
  try {
    db.runSync("UPDATE transactions SET category_id = 'cat_others' WHERE category_id = ?", [categoryId]);
    db.runSync("UPDATE transaction_category_overrides SET category_id = 'cat_others' WHERE category_id = ?", [categoryId]);
    db.runSync('DELETE FROM categories WHERE id = ?', [categoryId]);
  } catch (e) {
    console.warn('[db.web] Falha ao excluir categoria:', e);
  }
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
    console.warn('[db.web] Falha ao atualizar categoria da transação:', e);
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
    console.warn('[db.web] Falha ao obter overrides de categorias:', e);
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

export function persistNotificationPreference(pref: string): void {
  try {
    db.runSync(
      'INSERT OR REPLACE INTO system_meta (key, value) VALUES (?, ?)',
      ['notification_preference', pref]
    );
  } catch (e) {
    console.warn('[db.web] Falha ao persistir preferência de notificação:', e);
  }
}

export function loadNotificationPreference(): 'all' | 'alerts_only' | 'transactions_only' | 'none' {
  try {
    const row = db.getFirstSync<{ value: string }>(
      'SELECT value FROM system_meta WHERE key = ?',
      ['notification_preference']
    );
    if (row?.value === 'all' || row?.value === 'alerts_only' || row?.value === 'transactions_only' || row?.value === 'none') {
      return row.value;
    }
    return 'all';
  } catch {
    return 'all';
  }
}

export function clearAllLocalData(): void {
  try {
    db.execSync(`
      DELETE FROM transactions;
      DELETE FROM cards;
      DELETE FROM transaction_category_overrides;
      DELETE FROM system_meta WHERE key NOT IN ('pluggy_client_id', 'pluggy_client_secret');
    `);
    initDatabase();
  } catch (e) {
    console.warn('[db.web] Erro ao limpar dados locais:', e);
  }
}

