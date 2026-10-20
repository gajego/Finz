import { Linking } from 'react-native';
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

  const options: Record<string, any> = {
    oauthRedirectUri: 'finz://pluggy-callback',
    includeSandbox: true,
    products: ['ACCOUNTS', 'CREDIT_CARDS', 'TRANSACTIONS', 'PAYMENT_DATA'],
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
  const widgetUrl = `https://connect.pluggy.ai/?connect_token=${encodeURIComponent(connectToken)}&connectToken=${encodeURIComponent(connectToken)}&includeSandbox=true&theme=${theme}&products=ACCOUNTS,CREDIT_CARDS,TRANSACTIONS`;
  await Linking.openURL(widgetUrl);
  return widgetUrl;
}

/**
 * Busca transações com estratégia resiliente e cursor-based pagination da Pluggy v2
 */
async function fetchTransactionsFromPluggy(
  accountId: string,
  apiKey: string,
  fromDate: string,
  pageSize: number = 100
): Promise<PluggyTransaction[]> {
  const allTxs: PluggyTransaction[] = [];

  // Estratégia 1: Endpoint v2 oficial com filtro de data (últimos 30 dias) e cursor pagination
  try {
    let nextUrl: string | null = `${PLUGGY_API_BASE}/v2/transactions?accountId=${accountId}&from=${fromDate}&pageSize=${pageSize}`;
    let pageCount = 0;

    while (nextUrl && pageCount < 10) {
      pageCount++;
      console.log(`[Pluggy] GET ${nextUrl} (Página ${pageCount})...`);
      const res: Response = await fetch(nextUrl, {
        headers: { 'X-API-KEY': apiKey },
      });

      if (!res.ok) {
        const errorText: string = await res.text();
        console.warn(`[Pluggy] /v2/transactions retorno ${res.status}: ${errorText}`);
        break;
      }

      const data: any = await res.json();
      const results: PluggyTransaction[] = data?.results || [];
      if (results.length > 0) {
        allTxs.push(...results);
      }

      // Cursor de paginação da Pluggy: campo `next`
      if (data?.next) {
        nextUrl = data.next.startsWith('http')
          ? data.next
          : `${PLUGGY_API_BASE}/v2/transactions${data.next.startsWith('?') ? '' : '?'}${data.next}`;
      } else {
        nextUrl = null;
      }
    }

    if (allTxs.length > 0) {
      console.log(`[Pluggy] ✅ Total de ${allTxs.length} transação(ões) obtidas via v2 (com data).`);
      return allTxs;
    }
  } catch (err) {
    console.warn(`[Pluggy] Falha ao consultar /v2/transactions com filtro de data para conta ${accountId}:`, err);
  }

  // Estratégia 2: Se não retornou nada com filtro de data, consulta v2 sem filtro de data (todo o histórico do banco)
  try {
    let nextUrl: string | null = `${PLUGGY_API_BASE}/v2/transactions?accountId=${accountId}&pageSize=${pageSize}`;
    let pageCount = 0;

    while (nextUrl && pageCount < 5) {
      pageCount++;
      console.log(`[Pluggy] GET v2 sem filtro: ${nextUrl}...`);
      const res: Response = await fetch(nextUrl, {
        headers: { 'X-API-KEY': apiKey },
      });

      if (!res.ok) {
        const errorText: string = await res.text();
        console.warn(`[Pluggy] /v2/transactions sem data retorno ${res.status}: ${errorText}`);
        break;
      }

      const data: any = await res.json();
      const results: PluggyTransaction[] = data?.results || [];
      if (results.length > 0) {
        allTxs.push(...results);
      }

      if (data?.next) {
        nextUrl = data.next.startsWith('http')
          ? data.next
          : `${PLUGGY_API_BASE}/v2/transactions${data.next.startsWith('?') ? '' : '?'}${data.next}`;
      } else {
        nextUrl = null;
      }
    }

    if (allTxs.length > 0) {
      console.log(`[Pluggy] ✅ Total de ${allTxs.length} transação(ões) obtidas via v2 (sem filtro de data).`);
      return allTxs;
    }
  } catch (err) {
    console.warn(`[Pluggy] Falha ao consultar /v2/transactions sem filtro para conta ${accountId}:`, err);
  }

  // Estratégia 3: Fallback para endpoint v1 legado (/transactions)
  try {
    const v1Url = `${PLUGGY_API_BASE}/transactions?accountId=${accountId}&from=${fromDate}&pageSize=${pageSize}`;
    console.log(`[Pluggy] Fallback v1: ${v1Url}...`);
    const res: Response = await fetch(v1Url, {
      headers: { 'X-API-KEY': apiKey },
    });

    if (res.ok) {
      const data: any = await res.json();
      const results: PluggyTransaction[] = data?.results || [];
      if (results.length > 0) {
        console.log(`[Pluggy] ✅ Total de ${results.length} transação(ões) obtidas via v1.`);
        return results;
      }
    } else {
      const errorText: string = await res.text();
      console.warn(`[Pluggy] /transactions v1 retorno ${res.status}: ${errorText}`);
    }
  } catch (err) {
    console.warn(`[Pluggy] Falha ao consultar fallback v1 para conta ${accountId}:`, err);
  }

  return allTxs;
}

/**
 * Sincroniza contas e cartões de um ItemId conectado
 */
export async function syncPluggyItem(itemId: string): Promise<{ cardsCount: number; txCount: number }> {
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
  const accounts: PluggyAccount[] = accData.results || [];

  const store = useWalletStore.getState();
  const cardholder = (store.profile.fullName || store.profile.nickname || 'MEU CARTAO').toUpperCase();

  // Identifica contas do tipo BANK (conta corrente) e CREDIT (cartão de crédito)
  const bankAccounts = accounts.filter((a) => a.type === 'BANK');
  const creditAccounts = accounts.filter((a) => a.type === 'CREDIT');

  // Saldo real em conta corrente em centavos (soma se houver mais de uma conta corrente)
  const totalBankBalanceCents = bankAccounts.reduce(
    (sum, acc) => sum + Math.round((acc.balance || 0) * 100),
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
      const lastFour = (cAcc.number || '').replace(/\D/g, '').slice(-4) || '1234';
      const balanceCents = Math.round(Math.abs(cAcc.balance || 0) * 100);
      const limitCents = cAcc.creditData?.limit
        ? Math.round(cAcc.creditData.limit * 100)
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
      const lastFour = (bAcc.number || '').replace(/\D/g, '').slice(-4) || '0001';
      const bankBalanceCents = Math.round((bAcc.balance || 0) * 100);

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
  }

  // Persiste cada cartão atualizado no SQLite e monitora alterações de saldo bancário
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

    // Dispara notificação nativa se o saldo bancário da conta corrente mudou
    if (
      previousRow &&
      typeof previousRow.bank_balance === 'number' &&
      card.bankBalance !== undefined &&
      previousRow.bank_balance !== card.bankBalance
    ) {
      notifyBalanceChange(card.bankName, previousRow.bank_balance, card.bankBalance);
    }
  }

  // Define o cartão principal alvo para associar transações de contas correntes
  const primaryCardId = cardsToProcess.length > 0 ? cardsToProcess[0].id : `pluggy_card_${itemId}`;

  // Janela retroativa dos últimos 30 dias (YYYY-MM-DD)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const fromDate = thirtyDaysAgo.toISOString().slice(0, 10);

  // 3. Sincroniza todas as transações dos últimos 30 dias de todas as contas do conector
  for (const acc of accounts) {
    try {
      // Define a qual cartão esta transação deve ser vinculada
      const targetCardId =
        acc.type === 'CREDIT'
          ? `pluggy_card_${acc.id}`
          : primaryCardId;

      const matchedCard = cardsToProcess.find((c) => c.id === targetCardId) || cardsToProcess[0];
      const targetCardName = matchedCard?.bankName || connectorName;

      const newTxsToNotify: Transaction[] = [];

      // Consulta resiliente em todas as variações de endpoints (v2 e v1)
      const currentResults = await fetchTransactionsFromPluggy(acc.id, apiKey, fromDate, 100);

      for (const t of currentResults) {
        const txId = `pluggy_tx_${t.id}`;
        const amountCents = Math.round(Math.abs(t.amount) * 100);
        const timestamp = new Date(t.date).getTime() || Date.now();
        const categoryId = mapPluggyCategoryToFinz(t.category);

        // Verifica se já existia previamente no SQLite local (diffing)
        const existingTx = db.getFirstSync<{ id: string }>(
          'SELECT id FROM transactions WHERE id = ?',
          [txId]
        );

        // Classificação inteligente de Pix e Crédito/Débito
        const isCredit = t.type === 'CREDIT' || (typeof t.amount === 'number' && t.amount > 0);
        const isPix = /pix/i.test(t.description || '');

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

        // Se a transação não existia no banco local, agenda notificação
        if (!existingTx) {
          txCount++;
          newTxsToNotify.push(transaction);
        }
      }

      // Notifica o usuário sobre movimentações novas (Pix ou transações)
      if (newTxsToNotify.length > 0) {
        if (newTxsToNotify.length <= 5) {
          for (const newTx of newTxsToNotify) {
            await notifyNewTransaction(newTx, targetCardName);
          }
        } else {
          // Notifica os 3 mais recentes individualmente
          for (const newTx of newTxsToNotify.slice(0, 3)) {
            await notifyNewTransaction(newTx, targetCardName);
          }
          // Notificação de resumo para o restante do lote
          await notifyNewTransaction(
            `${newTxsToNotify.length} movimentações recebidas`,
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
 * Sincroniza todos os bancos conectados anteriormente
 */
export async function syncAllPluggyItems(): Promise<{ cardsTotal: number; txTotal: number }> {
  // 1. Busca todos os itens remotos cadastrados na Pluggy
  try {
    const apiKey = await getValidApiKey();
    const itemsRes = await fetch(`${PLUGGY_API_BASE}/items`, {
      headers: { 'X-API-KEY': apiKey },
    });
    if (itemsRes.ok) {
      const data = await itemsRes.json();
      const remoteItems: any[] = data.results || [];
      for (const it of remoteItems) {
        if (it?.id) {
          savePluggyItemId(it.id);
        }
      }
    }
  } catch (e) {
    console.warn('[Pluggy] Erro ao sincronizar lista de itens remotos:', e);
  }

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
