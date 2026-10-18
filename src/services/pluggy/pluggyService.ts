import { Linking } from 'react-native';
import { db } from '@/services/database/db';
import { BankCard, Transaction } from '@/types';
import { useWalletStore } from '@/store/useWalletStore';

const PLUGGY_API_BASE = 'https://api.pluggy.ai';

export interface PluggyCredentials {
  clientId: string;
  clientSecret: string;
}

export interface PluggyAccount {
  id: string;
  type: 'BANK' | 'CREDIT';
  name: string;
  number?: string;
  balance: number;
  currencyCode?: string;
  itemId: string;
  creditData?: {
    level?: string;
    brand?: string;
    balanceCloseDate?: string;
    balanceDueDate?: string;
    availableLimit?: number;
    limit?: number;
  };
}

export interface PluggyTransaction {
  id: string;
  description: string;
  amount: number;
  date: string;
  category?: string;
  type: 'DEBIT' | 'CREDIT';
}

/**
 * Salva as credenciais da Pluggy localmente em SQLite
 */
export function savePluggyCredentials(clientId: string, clientSecret: string) {
  db.execSync('CREATE TABLE IF NOT EXISTS system_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);');
  db.runSync(
    'INSERT OR REPLACE INTO system_meta (key, value) VALUES (?, ?)',
    ['pluggy_client_id', clientId.trim()]
  );
  db.runSync(
    'INSERT OR REPLACE INTO system_meta (key, value) VALUES (?, ?)',
    ['pluggy_client_secret', clientSecret.trim()]
  );
}

/**
 * Retorna as credenciais da Pluggy salvas
 */
export function getPluggyCredentials(): PluggyCredentials | null {
  try {
    db.execSync('CREATE TABLE IF NOT EXISTS system_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);');
    const clientIdRow = db.getFirstSync<{ value: string }>(
      'SELECT value FROM system_meta WHERE key = ?',
      ['pluggy_client_id']
    );
    const clientSecretRow = db.getFirstSync<{ value: string }>(
      'SELECT value FROM system_meta WHERE key = ?',
      ['pluggy_client_secret']
    );

    if (clientIdRow?.value && clientSecretRow?.value) {
      return {
        clientId: clientIdRow.value,
        clientSecret: clientSecretRow.value,
      };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Remove credenciais salvas da Pluggy
 */
export function clearPluggyCredentials() {
  try {
    db.runSync('DELETE FROM system_meta WHERE key LIKE "pluggy_%"');
  } catch (e) {
    console.warn('[Pluggy] Erro ao limpar credenciais:', e);
  }
}

/**
 * Salva um ItemId (conexão com instituição bancária) no banco
 */
export function savePluggyItemId(itemId: string) {
  try {
    db.execSync('CREATE TABLE IF NOT EXISTS system_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);');
    const existing = getPluggyItemIds();
    if (!existing.includes(itemId)) {
      existing.push(itemId);
      db.runSync(
        'INSERT OR REPLACE INTO system_meta (key, value) VALUES (?, ?)',
        ['pluggy_items', JSON.stringify(existing)]
      );
    }
  } catch (e) {
    console.warn('[Pluggy] Erro ao salvar itemId:', e);
  }
}

/**
 * Retorna todos os ItemIds salvos
 */
export function getPluggyItemIds(): string[] {
  try {
    db.execSync('CREATE TABLE IF NOT EXISTS system_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);');
    const row = db.getFirstSync<{ value: string }>(
      'SELECT value FROM system_meta WHERE key = ?',
      ['pluggy_items']
    );
    if (row?.value) {
      return JSON.parse(row.value);
    }
    return [];
  } catch {
    return [];
  }
}

/**
 * Obtém ou renova a API Key da Pluggy (válida por 2 horas)
 */
export async function getValidApiKey(): Promise<string> {
  const creds = getPluggyCredentials();
  if (!creds) {
    throw new Error('Credenciais da Pluggy não configuradas.');
  }

  // Verifica cache da API Key
  try {
    const cachedKeyRow = db.getFirstSync<{ value: string }>(
      'SELECT value FROM system_meta WHERE key = ?',
      ['pluggy_api_key']
    );
    const expiresRow = db.getFirstSync<{ value: string }>(
      'SELECT value FROM system_meta WHERE key = ?',
      ['pluggy_api_key_expires']
    );

    if (cachedKeyRow?.value && expiresRow?.value) {
      const expiresAt = parseInt(expiresRow.value, 10);
      // Margem de segurança de 5 minutos
      if (Date.now() < expiresAt - 5 * 60 * 1000) {
        return cachedKeyRow.value;
      }
    }
  } catch {
    // Segue para renovar caso a tabela não esteja pronta
  }

  // Faz login na API Pluggy: POST /auth
  const response = await fetch(`${PLUGGY_API_BASE}/auth`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      clientId: creds.clientId,
      clientSecret: creds.clientSecret,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Falha na autenticação da Pluggy (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const apiKey = data.apiKey;

  if (!apiKey) {
    throw new Error('Resposta de autenticação da Pluggy inválida (apiKey não encontrada).');
  }

  // Salva no cache com expiração de 2h
  const expiresAt = Date.now() + 2 * 60 * 60 * 1000;
  db.runSync(
    'INSERT OR REPLACE INTO system_meta (key, value) VALUES (?, ?)',
    ['pluggy_api_key', apiKey]
  );
  db.runSync(
    'INSERT OR REPLACE INTO system_meta (key, value) VALUES (?, ?)',
    ['pluggy_api_key_expires', expiresAt.toString()]
  );

  return apiKey;
}

/**
 * Cria um Connect Token para inicializar o Pluggy Connect Widget
 */
export async function createConnectToken(): Promise<string> {
  const apiKey = await getValidApiKey();

  const response = await fetch(`${PLUGGY_API_BASE}/connect_token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-KEY': apiKey,
    },
    body: JSON.stringify({
      options: {
        oauthRedirectUri: 'finz://pluggy-callback',
        avoidDuplicates: true,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Erro ao gerar Connect Token (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  return data.accessToken;
}

/**
 * Abre o widget oficial da Pluggy no navegador/in-app para o usuário conectar seu banco
 */
export async function openPluggyConnectWidget(): Promise<string> {
  const connectToken = await createConnectToken();
  const widgetUrl = `https://connect.pluggy.ai/?connectToken=${connectToken}`;
  await Linking.openURL(widgetUrl);
  return widgetUrl;
}

/**
 * Sincroniza contas e cartões de um ItemId conectado
 */
export async function syncPluggyItem(itemId: string): Promise<{ cardsCount: number; txCount: number }> {
  const apiKey = await getValidApiKey();

  // 1. Busca dados do conector (banco)
  let bankName = 'BANCO CONECTADO';
  try {
    const itemRes = await fetch(`${PLUGGY_API_BASE}/items/${itemId}`, {
      headers: { 'X-API-KEY': apiKey },
    });
    if (itemRes.ok) {
      const itemData = await itemRes.json();
      bankName = itemData?.connector?.name?.toUpperCase() || bankName;
    }
  } catch (e) {
    console.warn('[Pluggy] Erro ao buscar dados do conector:', e);
  }

  // 2. Busca contas e cartões de crédito
  const accRes = await fetch(`${PLUGGY_API_BASE}/accounts?itemId=${itemId}`, {
    headers: { 'X-API-KEY': apiKey },
  });

  if (!accRes.ok) {
    throw new Error(`Erro ao buscar contas (${accRes.status})`);
  }

  const accData = await accRes.json();
  const accounts: PluggyAccount[] = accData.results || [];

  const store = useWalletStore.getState();
  let cardsCount = 0;
  let txCount = 0;

  for (const acc of accounts) {
    const isCredit = acc.type === 'CREDIT';
    const lastFour = (acc.number || '').replace(/\D/g, '').slice(-4) || '1234';
    const limitCents = acc.creditData?.limit
      ? Math.round(acc.creditData.limit * 100)
      : Math.max(Math.round(Math.abs(acc.balance) * 100), 200000);
    const balanceCents = Math.round(Math.abs(acc.balance) * 100);

    const theme = getBankPresetTheme(bankName);

    const cardId = `pluggy_card_${acc.id}`;
    const card: BankCard = {
      id: cardId,
      bankName: bankName,
      packageName: theme.packageName,
      lastFourDigits: lastFour,
      gradient: theme.gradient,
      accentColor: theme.color,
      cardholderName: (store.profile.fullName || store.profile.nickname || 'MEU CARTAO').toUpperCase(),
      balance: balanceCents,
      limit: limitCents,
    };

    // Salva ou atualiza no banco SQLite e memória
    db.runSync(
      `INSERT OR REPLACE INTO cards (id, bank_name, package_name, last_four, gradient_0, gradient_1, wallpaper_uri, accent_color, cardholder_name, balance, limit_cents)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        card.id,
        card.bankName,
        card.packageName,
        card.lastFourDigits,
        card.gradient[0],
        card.gradient[1],
        null,
        card.accentColor,
        card.cardholderName,
        card.balance,
        card.limit,
      ]
    );

    // Atualiza estado do Zustand
    const existingCards = store.cards;
    const exists = existingCards.some((c) => c.id === card.id);
    if (exists) {
      useWalletStore.setState({
        cards: existingCards.map((c) => (c.id === card.id ? card : c)),
      });
    } else {
      useWalletStore.setState({
        cards: [...existingCards, card],
        activeCardIndex: existingCards.length,
      });
    }
    cardsCount++;

    // 3. Busca transações recentes da conta / fatura
    try {
      const txRes = await fetch(`${PLUGGY_API_BASE}/transactions?accountId=${acc.id}&pageSize=20`, {
        headers: { 'X-API-KEY': apiKey },
      });
      if (txRes.ok) {
        const txData = await txRes.json();
        const txs: PluggyTransaction[] = txData.results || [];

        for (const t of txs) {
          const txId = `pluggy_tx_${t.id}`;
          const amountCents = Math.round(Math.abs(t.amount) * 100);
          const timestamp = new Date(t.date).getTime() || Date.now();
          const categoryId = mapPluggyCategoryToFinz(t.category);

          const transaction: Transaction = {
            id: txId,
            cardId: card.id,
            amount: amountCents,
            type: 'EXPENSE',
            merchant: t.description || 'Transação Open Finance',
            categoryId: categoryId,
            timestamp: timestamp,
            rawText: `Pluggy: ${t.description}`,
          };

          db.runSync(
            `INSERT OR REPLACE INTO transactions (id, card_id, amount, type, merchant, category_id, timestamp, raw_text)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              transaction.id,
              transaction.cardId,
              transaction.amount,
              transaction.type,
              transaction.merchant,
              transaction.categoryId,
              transaction.timestamp,
              transaction.rawText || null,
            ]
          );
          txCount++;
        }
      }
    } catch (e) {
      console.warn(`[Pluggy] Erro ao sincronizar transações da conta ${acc.id}:`, e);
    }
  }

  // Recarrega transações no Zustand
  const refreshedTransactions = db.getAllSync<any>('SELECT * FROM transactions ORDER BY timestamp DESC LIMIT 100');
  useWalletStore.setState({
    transactions: refreshedTransactions.map((r) => ({
      id: r.id,
      cardId: r.card_id,
      amount: r.amount,
      type: r.type,
      merchant: r.merchant,
      categoryId: r.category_id,
      timestamp: r.timestamp,
      rawText: r.raw_text,
    })),
  });

  savePluggyItemId(itemId);
  return { cardsCount, txCount };
}

/**
 * Sincroniza todos os bancos conectados anteriormente
 */
export async function syncAllPluggyItems(): Promise<{ cardsTotal: number; txTotal: number }> {
  const itemIds = getPluggyItemIds();
  let cardsTotal = 0;
  let txTotal = 0;

  for (const itemId of itemIds) {
    try {
      const res = await syncPluggyItem(itemId);
      cardsTotal += res.cardsCount;
      txTotal += res.txCount;
    } catch (e) {
      console.warn(`[Pluggy] Erro ao sincronizar item ${itemId}:`, e);
    }
  }

  return { cardsTotal, txTotal };
}

/**
 * Retorna cores e gradientes adequados com base no nome do banco
 */
function getBankPresetTheme(name: string): {
  packageName: string;
  gradient: [string, string];
  color: string;
} {
  const lower = name.toLowerCase();
  if (lower.includes('nu') || lower.includes('nubank')) {
    return { packageName: 'com.nu.production', gradient: ['#820AD1', '#4C0677'], color: '#820AD1' };
  }
  if (lower.includes('itau') || lower.includes('itaú')) {
    return { packageName: 'com.itau', gradient: ['#EC7000', '#1C1917'], color: '#EC7000' };
  }
  if (lower.includes('inter')) {
    return { packageName: 'br.com.intermedium', gradient: ['#FF7A00', '#D95A00'], color: '#FF7A00' };
  }
  if (lower.includes('bradesco')) {
    return { packageName: 'com.bancobradesco', gradient: ['#CC092F', '#7A041A'], color: '#CC092F' };
  }
  if (lower.includes('c6')) {
    return { packageName: 'com.c6bank.app', gradient: ['#1C1C1E', '#000000'], color: '#242424' };
  }
  if (lower.includes('santander')) {
    return { packageName: 'com.santander.app', gradient: ['#EA1D2C', '#7F0A11'], color: '#EA1D2C' };
  }
  if (lower.includes('mercado')) {
    return { packageName: 'com.mercadopago.wallet', gradient: ['#009EE3', '#005E8A'], color: '#009EE3' };
  }
  if (lower.includes('btg')) {
    return { packageName: 'com.btg', gradient: ['#001E62', '#000D2B'], color: '#001E62' };
  }

  // Padrão Neo-Fintech Titânio
  return { packageName: 'com.finz.openfinance', gradient: ['#27272A', '#09090B'], color: '#84CC16' };
}

/**
 * Mapeia categorias da Pluggy para as categorias locais do Finz
 */
function mapPluggyCategoryToFinz(pluggyCategory?: string): string {
  if (!pluggyCategory) return 'cat_outros';
  const lower = pluggyCategory.toLowerCase();

  if (lower.includes('aliment') || lower.includes('restauran') || lower.includes('refei') || lower.includes('supermercad')) {
    return 'cat_alimentacao';
  }
  if (lower.includes('transporte') || lower.includes('uber') || lower.includes('combust') || lower.includes('viag')) {
    return 'cat_transporte';
  }
  if (lower.includes('lazer') || lower.includes('jogos') || lower.includes('eletron') || lower.includes('setup') || lower.includes('entreten')) {
    return 'cat_lazer';
  }
  if (lower.includes('invest') || lower.includes('aplica') || lower.includes('renda') || lower.includes('bolsa')) {
    return 'cat_investimentos';
  }

  return 'cat_outros';
}
