import { Linking, Platform } from 'react-native';
import { db, loadAllDataFromSQLite } from '@/services/database/db';
import { BankCard, Transaction, TransactionType } from '@/types';
import { useWalletStore } from '@/store/useWalletStore';
import { notifyNewTransaction, notifyBalanceChange } from '@/services/notifications/notificationService';

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
  operationType?: string;
  merchant?: {
    businessName?: string;
    category?: string;
  };
  creditCardMetadata?: {
    purchaseDate?: string;
    transactionDateTime?: string;
    cardNumber?: string;
    installmentNumber?: number;
    totalInstallments?: number;
  };
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
 * Retorna as credenciais da Pluggy e a origem (process.env ou SQLite)
 */
export function getPluggyCredentialsWithSource(): {
  creds: PluggyCredentials | null;
  source: 'env' | 'sqlite' | 'none';
} {
  // 1. Tenta obter do process.env (EXPO_PUBLIC_... ou direto)
  const envClientId =
    (typeof process !== 'undefined' && (process.env?.EXPO_PUBLIC_PLUGGY_CLIENT_ID || process.env?.PLUGGY_CLIENT_ID)) ||
    '';
  const envClientSecret =
    (typeof process !== 'undefined' && (process.env?.EXPO_PUBLIC_PLUGGY_CLIENT_SECRET || process.env?.PLUGGY_CLIENT_SECRET)) ||
    '';

  if (envClientId.trim() && envClientSecret.trim()) {
    return {
      creds: {
        clientId: envClientId.trim(),
        clientSecret: envClientSecret.trim(),
      },
      source: 'env',
    };
  }

  // 2. Fallback para credenciais salvas no SQLite local
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
        creds: {
          clientId: clientIdRow.value.trim(),
          clientSecret: clientSecretRow.value.trim(),
        },
        source: 'sqlite',
      };
    }
  } catch (e) {
    console.warn('[Pluggy] Erro ao ler credenciais do SQLite:', e);
  }

  return { creds: null, source: 'none' };
}

/**
 * Retorna as credenciais da Pluggy salvas (.env com prioridade, fallback para SQLite)
 */
export function getPluggyCredentials(): PluggyCredentials | null {
  return getPluggyCredentialsWithSource().creds;
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
 * @param itemId Opcional: ID de um item existente para abrir em modo de atualização
 */
export async function createConnectToken(itemId?: string): Promise<string> {
  const apiKey = await getValidApiKey();

  const isWeb = Platform.OS === 'web' && typeof window !== 'undefined';
  const oauthRedirectUri = isWeb
    ? `${window.location.origin}/?pluggy-callback=true`
    : 'finz://pluggy-callback';

  const options: Record<string, any> = {
    oauthRedirectUri,
    includeSandbox: true,
  };

  if (itemId) {
    options.itemId = itemId;
  }

  const response = await fetch(`${PLUGGY_API_BASE}/connect_token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-KEY': apiKey,
    },
    body: JSON.stringify({ options }),
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
export async function openPluggyConnectWidget(theme: 'light' | 'dark' = 'dark', itemId?: string): Promise<string> {
  const connectToken = await createConnectToken(itemId);
  const widgetUrl = `https://connect.pluggy.ai/?connect_token=${encodeURIComponent(connectToken)}&connectToken=${encodeURIComponent(connectToken)}&includeSandbox=true&theme=${theme}`;
  await Linking.openURL(widgetUrl);
  return widgetUrl;
}

/**
 * Busca transações com cursor-based pagination da Pluggy v2
 */
export async function fetchTransactionsFromPluggy(
  accountId: string,
  apiKey: string,
  maxPages: number = 15
): Promise<PluggyTransaction[]> {
  const allTxs: PluggyTransaction[] = [];
  let nextUrl: string | null = `${PLUGGY_API_BASE}/v2/transactions?accountId=${accountId}`;
  let pageCount = 0;

  try {
    while (nextUrl && pageCount < maxPages) {
      pageCount++;
      console.log(`[Pluggy] GET ${nextUrl} (Página ${pageCount}/${maxPages})...`);
      const res: Response = await fetch(nextUrl, {
        headers: { 'X-API-KEY': apiKey },
      });

      if (!res.ok) {
        const errorText: string = await res.text();
        console.warn(`[Pluggy] /v2/transactions retorno ${res.status}: ${errorText}`);
        break;
      }

      const data: any = await res.json();
      const results: PluggyTransaction[] = Array.isArray(data?.results) ? data.results : [];
      if (results.length > 0) {
        allTxs.push(...results);
      }

      // Cursor pagination da Pluggy v2 via data.next
      if (data?.next) {
        nextUrl = data.next.startsWith('http')
          ? data.next
          : `https://api.pluggy.ai/v2/transactions${data.next.startsWith('?') ? '' : '?'}${data.next}`;
      } else {
        nextUrl = null;
      }
    }

    console.log(`[Pluggy] ✅ Total de ${allTxs.length} transação(ões) obtidas via v2 para conta ${accountId}.`);
  } catch (err) {
    console.warn(`[Pluggy] Falha ao consultar /v2/transactions para conta ${accountId}:`, err);
  }

  return allTxs;
}

// Locks em memória para garantir idempotência contra chamadas paralelas concorrentes
const activeItemSyncs = new Map<string, Promise<{ cardsCount: number; txCount: number }>>();
let activeSyncAllPromise: Promise<{ cardsTotal: number; txTotal: number }> | null = null;

/**
 * Sincroniza contas e cartões de um ItemId conectado (com lock de concorrência)
 */
export async function syncPluggyItem(itemId: string): Promise<{ cardsCount: number; txCount: number }> {
  const running = activeItemSyncs.get(itemId);
  if (running) {
    return running;
  }
  const promise = doSyncPluggyItem(itemId).finally(() => {
    activeItemSyncs.delete(itemId);
  });
  activeItemSyncs.set(itemId, promise);
  return promise;
}

async function doSyncPluggyItem(itemId: string): Promise<{ cardsCount: number; txCount: number }> {
  const apiKey = await getValidApiKey();

  // 1. Busca dados do conector (banco)
  let connectorName = 'BANCO CONECTADO';
  try {
    const itemRes = await fetch(`${PLUGGY_API_BASE}/items/${itemId}`, {
      headers: { 'X-API-KEY': apiKey },
    });
    if (itemRes.ok) {
      const itemData = await itemRes.json();
      connectorName = itemData?.connector?.name?.toUpperCase() || connectorName;
    }
  } catch (e) {
    console.warn('[Pluggy] Erro ao buscar dados do conector:', e);
  }

  // 2. Busca contas e cartões de crédito da instituição
  const accRes = await fetch(`${PLUGGY_API_BASE}/accounts?itemId=${itemId}`, {
    headers: { 'X-API-KEY': apiKey },
  });

  if (!accRes.ok) {
    throw new Error(`Erro ao buscar contas (${accRes.status})`);
  }

  const accData = await accRes.json();
  const accounts: PluggyAccount[] = Array.isArray(accData?.results) ? accData.results : [];

  const store = useWalletStore.getState();
  const cardholder = (store.profile.fullName || store.profile.nickname || 'MEU CARTAO').toUpperCase();

  // Identifica contas do tipo BANK (conta corrente) e CREDIT (cartão de crédito)
  const bankAccounts = accounts.filter((a) => a.type === 'BANK');
  const creditAccounts = accounts.filter((a) => a.type === 'CREDIT');

  // Saldo real em conta corrente em centavos (soma se houver mais de uma conta corrente)
  const totalBankBalanceCents = bankAccounts.reduce(
    (sum, acc) => {
      const bal = typeof acc.balance === 'number' && Number.isFinite(acc.balance) ? acc.balance : 0;
      return sum + Math.round(bal * 100);
    },
    0
  );

  let cardsCount = 0;
  let txCount = 0;

  // Lista de cartões a salvar: se tiver contas de crédito, cada uma vira um cartão vinculado ao saldo bancário.
  // Se não tiver contas de crédito, a conta corrente vira o cartão principal.
  const cardsToProcess: BankCard[] = [];

  if (creditAccounts.length > 0) {
    for (const cAcc of creditAccounts) {
      const cardId = `pluggy_card_${cAcc.id}`;
      const lastFour = (cAcc.number ? String(cAcc.number) : '').replace(/\D/g, '').slice(-4) || '1234';
      const rawBal = typeof cAcc.balance === 'number' && Number.isFinite(cAcc.balance) ? cAcc.balance : 0;
      const balanceCents = Math.round(Math.abs(rawBal) * 100);
      const rawLimit = cAcc.creditData?.limit;
      const limitCents = typeof rawLimit === 'number' && Number.isFinite(rawLimit) && rawLimit > 0
        ? Math.round(rawLimit * 100)
        : Math.max(balanceCents, 200000);

      // Nome do cartão em si retornado pela Pluggy (evita nome genérico 'PLUGGY')
      let cardDisplayName = cAcc.name?.trim() || '';
      if (!cardDisplayName || /pluggy/i.test(cardDisplayName)) {
        if (connectorName && !/pluggy/i.test(connectorName)) {
          cardDisplayName = connectorName;
        } else if (cAcc.creditData?.brand) {
          cardDisplayName = `${cAcc.creditData.brand}${cAcc.creditData?.level ? ` ${cAcc.creditData.level}` : ''}`;
        } else {
          cardDisplayName = 'CARTÃO DE CRÉDITO';
        }
      }
      cardDisplayName = cardDisplayName.toUpperCase();

      const theme = getBankPresetTheme(cardDisplayName || connectorName);

      // Preserva skin personalizada caso o usuário já tenha customizado
      const existingCardRow = db.getFirstSync<{ wallpaper_uri?: string; gradient_0?: string; gradient_1?: string }>(
        'SELECT wallpaper_uri, gradient_0, gradient_1 FROM cards WHERE id = ?',
        [cardId]
      );

      const gradient: [string, string] =
        existingCardRow?.gradient_0 && existingCardRow?.gradient_1
          ? [existingCardRow.gradient_0, existingCardRow.gradient_1]
          : theme.gradient;

      cardsToProcess.push({
        id: cardId,
        bankName: cardDisplayName,
        packageName: theme.packageName,
        lastFourDigits: lastFour,
        gradient,
        wallpaperUri: existingCardRow?.wallpaper_uri || undefined,
        accentColor: theme.color,
        cardholderName: cardholder,
        balance: balanceCents, // Fatura do cartão em centavos
        limit: limitCents,
        bankBalance: totalBankBalanceCents, // Saldo em conta corrente em centavos
      });
    }
  } else if (bankAccounts.length > 0) {
    for (const bAcc of bankAccounts) {
      const cardId = `pluggy_card_${bAcc.id}`;
      const lastFour = (bAcc.number ? String(bAcc.number) : '').replace(/\D/g, '').slice(-4) || '0001';
      const rawBal = typeof bAcc.balance === 'number' && Number.isFinite(bAcc.balance) ? bAcc.balance : 0;
      const bankBalanceCents = Math.round(rawBal * 100);

      // Nome da conta/cartão em si retornado pela Pluggy
      let accountDisplayName = bAcc.name?.trim() || '';
      if (!accountDisplayName || /pluggy/i.test(accountDisplayName)) {
        if (connectorName && !/pluggy/i.test(connectorName)) {
          accountDisplayName = connectorName;
        } else {
          accountDisplayName = 'CONTA CORRENTE';
        }
      }
      accountDisplayName = accountDisplayName.toUpperCase();

      const theme = getBankPresetTheme(accountDisplayName || connectorName);

      const existingCardRow = db.getFirstSync<{ wallpaper_uri?: string; gradient_0?: string; gradient_1?: string }>(
        'SELECT wallpaper_uri, gradient_0, gradient_1 FROM cards WHERE id = ?',
        [cardId]
      );

      const gradient: [string, string] =
        existingCardRow?.gradient_0 && existingCardRow?.gradient_1
          ? [existingCardRow.gradient_0, existingCardRow.gradient_1]
          : theme.gradient;

      cardsToProcess.push({
        id: cardId,
        bankName: accountDisplayName,
        packageName: theme.packageName,
        lastFourDigits: lastFour,
        gradient,
        wallpaperUri: existingCardRow?.wallpaper_uri || undefined,
        accentColor: theme.color,
        cardholderName: cardholder,
        balance: 0,
        limit: 0,
        bankBalance: bankBalanceCents,
      });
    }
  } else if (accounts.length > 0) {
    for (const acc of accounts) {
      const cardId = `pluggy_card_${acc.id}`;
      const lastFour = (acc.number ? String(acc.number) : '').replace(/\D/g, '').slice(-4) || '0001';
      const rawBal = typeof acc.balance === 'number' && Number.isFinite(acc.balance) ? acc.balance : 0;
      const balanceCents = Math.round(rawBal * 100);
      const theme = getBankPresetTheme(acc.name || connectorName);
      cardsToProcess.push({
        id: cardId,
        bankName: (acc.name || connectorName).toUpperCase(),
        packageName: theme.packageName,
        lastFourDigits: lastFour,
        gradient: theme.gradient,
        accentColor: theme.color,
        cardholderName: cardholder,
        balance: 0,
        limit: 0,
        bankBalance: balanceCents,
      });
    }
  }

  // Se nenhum cartão foi gerado, cria um genérico para o conector
  if (cardsToProcess.length === 0) {
    const cardId = `pluggy_card_${itemId}`;
    const theme = getBankPresetTheme(connectorName);
    cardsToProcess.push({
      id: cardId,
      bankName: connectorName.toUpperCase(),
      packageName: theme.packageName,
      lastFourDigits: '0001',
      gradient: theme.gradient,
      accentColor: theme.color,
      cardholderName: cardholder,
      balance: 0,
      limit: 0,
      bankBalance: 0,
    });
  }

  // Persiste cada cartão atualizado no SQLite e monitora alterações de saldo bancário de forma atômica
  const cardBalanceNotifications: Array<{ bankName: string; prev: number; curr: number }> = [];

  const saveCardsBatch = () => {
    for (const card of cardsToProcess) {
      const previousRow = db.getFirstSync<{ bank_balance: number }>(
        'SELECT bank_balance FROM cards WHERE id = ?',
        [card.id]
      );

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
      cardsCount++;

      // Detecta alteração de saldo bancário na conta corrente
      const previousBankBalance = Number(previousRow?.bank_balance ?? 0);
      const newBankBalance = Number(card.bankBalance ?? 0);
      if (previousRow && previousBankBalance !== newBankBalance) {
        cardBalanceNotifications.push({
          bankName: card.bankName,
          prev: previousBankBalance,
          curr: newBankBalance,
        });
      }
    }
  };

  if (typeof (db as any).withTransactionSync === 'function') {
    (db as any).withTransactionSync(saveCardsBatch);
  } else {
    saveCardsBatch();
  }

  for (const notif of cardBalanceNotifications) {
    await notifyBalanceChange(notif.bankName, notif.prev, notif.curr);
  }

  // Define o cartão principal alvo para associar transações
  const primaryCardId = cardsToProcess[0].id;

  // Carrega IDs existentes previamente para diffing O(1) de alta performance sem falsos positivos
  const existingTxRows = db.getAllSync<{ id: string }>('SELECT id FROM transactions');
  const existingTxIds = new Set<string>(existingTxRows.map((r) => r.id));

  // 3. Sincroniza todas as transações de todas as contas do conector
  for (const acc of accounts) {
    try {
      // Define a qual cartão esta transação deve ser vinculada:
      // Se houver um cartão explicitamente criado com pluggy_card_${acc.id}, usa ele;
      // caso contrário, vincula ao cartão principal (primaryCardId).
      const exactCard = cardsToProcess.find((c) => c.id === `pluggy_card_${acc.id}`);
      const targetCardId = exactCard ? exactCard.id : primaryCardId;
      const matchedCard = cardsToProcess.find((c) => c.id === targetCardId) || cardsToProcess[0];
      const targetCardName = matchedCard?.bankName || connectorName;

      const newTxsToNotify: Transaction[] = [];

      // Consulta v2 oficial com cursor pagination sem from/pageSize
      const currentResults = await fetchTransactionsFromPluggy(acc.id, apiKey);

      const transactionsToPersist: Transaction[] = [];

      for (const t of currentResults) {
        if (!t || typeof t !== 'object') continue;
        const rawId = t.id ? String(t.id).trim() : '';
        if (!rawId) continue;
        const txId = `pluggy_tx_${rawId}`;

        // Coerção segura de amount
        const rawAmount = typeof t.amount === 'number' && Number.isFinite(t.amount)
          ? t.amount
          : typeof t.amount === 'string'
          ? parseFloat(t.amount)
          : 0;
        const safeAmount = Number.isFinite(rawAmount) ? rawAmount : 0;
        const amountCents = Math.round(Math.abs(safeAmount) * 100);

        // Captura de data precisa e resiliente a datas inválidas
        const dateStr =
          (t.creditCardMetadata?.purchaseDate && String(t.creditCardMetadata.purchaseDate).trim()) ||
          (t.creditCardMetadata?.transactionDateTime && String(t.creditCardMetadata.transactionDateTime).trim()) ||
          (t.date && String(t.date).trim());
        const parsedTime = dateStr ? new Date(dateStr).getTime() : NaN;
        const timestamp = Number.isFinite(parsedTime) && parsedTime > 0 ? parsedTime : Date.now();

        // Nome/Merchant limpo com fallback robusto
        const rawMerchantName =
          (t.merchant?.businessName && String(t.merchant.businessName).trim()) ||
          (t.description && String(t.description).trim()) ||
          'Transação Open Finance';

        let cleanDescription = rawMerchantName
          .replace(/^(compra\s+no\s+(débito|debito|crédito|credito)|compra\s+[àa]\s+vista|pagamento\s+via\s+pix|pix\s+(enviado|recebido))[|\s:-]+/i, '')
          .trim();
        if (!cleanDescription) {
          cleanDescription = rawMerchantName || 'Transação Open Finance';
        }

        const categoryId = mapPluggyCategoryToFinz(t.category || t.merchant?.category);

        // Classificação inteligente de Pix e Crédito/Débito
        const isCredit = t.type === 'CREDIT' || safeAmount > 0;
        const descForPix = `${t.description || ''} ${t.operationType || ''} ${cleanDescription}`;
        const isPix = /pix/i.test(descForPix);

        let txType: TransactionType;
        if (isPix) {
          txType = isCredit ? 'PIX_IN' : 'PIX_OUT';
        } else {
          txType = isCredit ? 'REFUND' : 'EXPENSE';
        }

        const transaction: Transaction = {
          id: txId,
          cardId: targetCardId,
          amount: amountCents,
          type: txType,
          merchant: cleanDescription,
          categoryId: categoryId,
          timestamp: timestamp,
          rawText: `Pluggy: ${t.description || cleanDescription}`,
        };

        transactionsToPersist.push(transaction);

        // Diffing: se a transação não existia previamente no SQLite local, contabiliza e agenda notificação
        if (!existingTxIds.has(txId)) {
          existingTxIds.add(txId);
          txCount++;
          newTxsToNotify.push(transaction);
        }
      }

      // Executa inserções transacionais em lote de alto desempenho (ACID)
      if (transactionsToPersist.length > 0) {
        const insertBatch = () => {
          for (const tx of transactionsToPersist) {
            db.runSync(
              `INSERT OR REPLACE INTO transactions (id, card_id, amount, type, merchant, category_id, timestamp, raw_text)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                tx.id,
                tx.cardId,
                tx.amount,
                tx.type,
                tx.merchant,
                tx.categoryId,
                tx.timestamp,
                tx.rawText || null,
              ]
            );
          }
        };

        if (typeof (db as any).withTransactionSync === 'function') {
          (db as any).withTransactionSync(insertBatch);
        } else {
          insertBatch();
        }
      }

      // Notifica o usuário sobre movimentações novas (Pix ou transações)
      if (newTxsToNotify.length > 0) {
        const sortedNew = [...newTxsToNotify].sort((a, b) => b.timestamp - a.timestamp);
        if (sortedNew.length <= 5) {
          for (const newTx of sortedNew) {
            await notifyNewTransaction(newTx, targetCardName);
          }
        } else {
          // Notifica os 3 mais recentes individualmente
          for (const newTx of sortedNew.slice(0, 3)) {
            await notifyNewTransaction(newTx, targetCardName);
          }
          // Notificação de resumo para o restante do lote
          await notifyNewTransaction(
            `${sortedNew.length} novas movimentações sincronizadas`,
            0,
            targetCardName
          );
        }
      }
    } catch (e) {
      console.warn(`[Pluggy] Erro ao sincronizar transações da conta ${acc.id}:`, e);
    }
  }

  // Recarrega cartões e transações no Zustand Store garantindo estado reativo imediato
  const updatedData = loadAllDataFromSQLite();
  useWalletStore.setState({
    cards: updatedData.cards,
    transactions: updatedData.transactions,
  });

  savePluggyItemId(itemId);
  return { cardsCount, txCount };
}

/**
 * Sincroniza todos os bancos conectados anteriormente (com lock de concorrência)
 */
export async function syncAllPluggyItems(): Promise<{ cardsTotal: number; txTotal: number }> {
  if (activeSyncAllPromise) {
    return activeSyncAllPromise;
  }
  activeSyncAllPromise = doSyncAllPluggyItems().finally(() => {
    activeSyncAllPromise = null;
  });
  return activeSyncAllPromise;
}

async function doSyncAllPluggyItems(): Promise<{ cardsTotal: number; txTotal: number }> {
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

  // Recarrega todos os dados no Zustand Store após o ciclo completo de sincronização
  const updatedData = loadAllDataFromSQLite();
  useWalletStore.setState({
    cards: updatedData.cards,
    transactions: updatedData.transactions,
  });

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
 * Mapeia categorias da Pluggy para as categorias canônicas locais do Finz
 */
function mapPluggyCategoryToFinz(pluggyCategory?: string): string {
  if (!pluggyCategory) return 'cat_food';
  const lower = pluggyCategory.toLowerCase();

  if (
    lower.includes('aliment') ||
    lower.includes('restauran') ||
    lower.includes('refei') ||
    lower.includes('supermercad') ||
    lower.includes('mercado') ||
    lower.includes('food') ||
    lower.includes('padaria') ||
    lower.includes('café') ||
    lower.includes('cafe')
  ) {
    return 'cat_food';
  }
  if (
    lower.includes('transporte') ||
    lower.includes('uber') ||
    lower.includes('combust') ||
    lower.includes('viag') ||
    lower.includes('posto') ||
    lower.includes('carro') ||
    lower.includes('99') ||
    lower.includes('estaciona')
  ) {
    return 'cat_transport';
  }
  if (
    lower.includes('lazer') ||
    lower.includes('jogos') ||
    lower.includes('eletron') ||
    lower.includes('setup') ||
    lower.includes('entreten') ||
    lower.includes('cinema') ||
    lower.includes('stream') ||
    lower.includes('game') ||
    lower.includes('steam') ||
    lower.includes('playstation')
  ) {
    return 'cat_leisure';
  }
  if (
    lower.includes('invest') ||
    lower.includes('aplica') ||
    lower.includes('renda') ||
    lower.includes('bolsa') ||
    lower.includes('shopping') ||
    lower.includes('compra') ||
    lower.includes('loja')
  ) {
    return 'cat_shopping';
  }

  return 'cat_food';
}
