import { Transaction, Category, BankCard, MonthClosingRecord } from '@/types';

function getDbModule() {
  try {
    return require('@/services/database/db');
  } catch {
    return null;
  }
}

/**
 * Retorna as partes de data no fuso de Brasília (UTC-3)
 */
function getBrazilDate(ts: number): { day: number; month: number; year: number } {
  try {
    const formatter = new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
    });
    const parts = formatter.formatToParts(new Date(ts));
    let day = 1;
    let month = 1;
    let year = 2026;
    for (const p of parts) {
      if (p.type === 'day') day = parseInt(p.value, 10);
      if (p.type === 'month') month = parseInt(p.value, 10);
      if (p.type === 'year') year = parseInt(p.value, 10);
    }
    return { day, month: month - 1, year };
  } catch {
    const d = new Date(ts);
    return { day: d.getDate(), month: d.getMonth(), year: d.getFullYear() };
  }
}

/**
 * Calcula o salário real da pessoa baseado nas categorias marcadas como isSalario
 */
export function calculateRealSalary(
  transactions: Transaction[],
  categories: Category[],
  startTs: number,
  endTs: number
): {
  totalSalary: number; // Centavos
  salaryTransactions: Transaction[];
  salaryCategoryNames: string[];
  hasSalaryCategory: boolean;
} {
  const salaryCategories = categories.filter((c) => c.isSalario);
  const salaryCatIds = new Set(salaryCategories.map((c) => c.id));
  const hasSalaryCategory = salaryCategories.length > 0;

  if (!hasSalaryCategory) {
    return {
      totalSalary: 0,
      salaryTransactions: [],
      salaryCategoryNames: [],
      hasSalaryCategory: false,
    };
  }

  const salaryTransactions: Transaction[] = [];
  let totalSalary = 0;

  for (const t of transactions) {
    if (t.timestamp < startTs || t.timestamp > endTs) continue;
    if (!salaryCatIds.has(t.categoryId)) continue;

    // Entradas financeiras na categoria de salário
    if (t.type === 'PIX_IN' || t.type === 'REFUND') {
      totalSalary += t.amount;
      salaryTransactions.push(t);
    } else if (t.type === 'EXPENSE' || t.type === 'PIX_OUT') {
      // Caso haja estorno ou ajuste negativo lançado como saída
      // Se for a única transação da categoria, consideramos o valor absoluto
      // Para manter a segurança contábil, entradas compõem o salário
    }
  }

  // Fallback pragmático: se o usuário marcou a categoria de salário e lançou
  // movimentações nela (mesmo como transação geral), computamos como receita de salário
  if (totalSalary === 0) {
    for (const t of transactions) {
      if (t.timestamp >= startTs && t.timestamp <= endTs && salaryCatIds.has(t.categoryId)) {
        totalSalary += t.amount;
        salaryTransactions.push(t);
      }
    }
  }

  return {
    totalSalary,
    salaryTransactions,
    salaryCategoryNames: salaryCategories.map((c) => c.name),
    hasSalaryCategory: true,
  };
}

/**
 * Calcula os dados de fechamento e sobra do mês para um mês específico
 */
export function calculateMonthSurplus(
  year: number,
  month: number, // 0-indexed (0 = Jan, 11 = Dez)
  transactions: Transaction[],
  categories: Category[],
  cards: BankCard[]
): MonthClosingRecord {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startOfMonth = new Date(year, month, 1, 0, 0, 0, 0).getTime();
  const endOfMonth = new Date(year, month, daysInMonth, 23, 59, 59, 999).getTime();

  const monthStr = String(month + 1).padStart(2, '0');
  const monthKey = `${year}-${monthStr}`;

  const monthDate = new Date(year, month, 1);
  const rawMonthName = monthDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  const monthLabel = rawMonthName.charAt(0).toUpperCase() + rawMonthName.slice(1);

  const isClosed = Date.now() > endOfMonth;
  const closedAt = isClosed ? endOfMonth : Date.now();

  const consideredCatIds = new Set(
    categories.filter((c) => c.considerar !== false).map((c) => c.id)
  );

  let totalIncome = 0;
  let totalExpense = 0;

  for (const t of transactions) {
    if (t.timestamp < startOfMonth || t.timestamp > endOfMonth) continue;

    if (t.type === 'PIX_IN' || t.type === 'REFUND') {
      totalIncome += t.amount;
    } else if (t.type === 'EXPENSE' || t.type === 'PIX_OUT') {
      if (consideredCatIds.has(t.categoryId)) {
        totalExpense += t.amount;
      }
    }
  }

  // Apuração do salário real no período
  const { totalSalary } = calculateRealSalary(
    transactions,
    categories,
    startOfMonth,
    endOfMonth
  );

  // Sobra líquida do mês (receitas - despesas)
  const netSurplus = totalIncome - totalExpense;

  // Saldo em conta: soma dos saldos reais dos cartões/contas
  const totalCardsBalance = cards.reduce(
    (sum, c) => sum + (c.bankBalance ?? c.balance ?? 0),
    0
  );

  // Se houver cartões/contas cadastrados, utilizamos o saldo em conta consolidado.
  // Caso contrário, a sobra líquida apurada das transações é o saldo da sobra.
  const accountBalance = cards.length > 0 ? totalCardsBalance : Math.max(0, netSurplus);

  // Base para cálculo da taxa de poupança/sobra: salário ou total de receitas
  const baseRevenue = totalSalary > 0 ? totalSalary : totalIncome;
  const savingsRate = baseRevenue > 0 ? Math.round((netSurplus / baseRevenue) * 100) : 0;

  return {
    monthKey,
    monthLabel,
    closedAt,
    accountBalance,
    netSurplus,
    totalIncome,
    totalExpense,
    salaryAmount: totalSalary,
    savingsRate,
    isClosed,
  };
}

/**
 * Retorna o histórico de sobras de meses (mês atual + meses anteriores)
 * com sincronização automática no SQLite para meses fechados.
 */
export function getMonthSurplusHistory(
  transactions: Transaction[],
  categories: Category[],
  cards: BankCard[],
  monthsCount: number = 6
): MonthClosingRecord[] {
  const now = Date.now();
  const { month: currentMonth, year: currentYear } = getBrazilDate(now);

  const db = getDbModule();
  const persistedClosings: MonthClosingRecord[] = db && typeof db.loadMonthClosingsFromSQLite === 'function'
    ? db.loadMonthClosingsFromSQLite()
    : [];
  const persistedMap = new Map<string, MonthClosingRecord>();
  for (const rec of persistedClosings) {
    persistedMap.set(rec.monthKey, rec);
  }

  const results: MonthClosingRecord[] = [];

  for (let i = 0; i < monthsCount; i++) {
    let targetMonth = currentMonth - i;
    let targetYear = currentYear;

    while (targetMonth < 0) {
      targetMonth += 12;
      targetYear -= 1;
    }

    const monthStr = String(targetMonth + 1).padStart(2, '0');
    const monthKey = `${targetYear}-${monthStr}`;

    // Se já temos registro persistido de um mês fechado, usamos o registro consolidado
    if (i > 0 && persistedMap.has(monthKey)) {
      results.push(persistedMap.get(monthKey)!);
      continue;
    }

    // Calcula dinamicamente
    const closing = calculateMonthSurplus(targetYear, targetMonth, transactions, categories, cards);

    // Se é um mês passado fechado e ainda não estava salvo, persiste para histórico indelével
    if (closing.isClosed && !persistedMap.has(monthKey) && db && typeof db.persistMonthClosingToSQLite === 'function') {
      db.persistMonthClosingToSQLite(closing);
      persistedMap.set(monthKey, closing);
    }

    results.push(closing);
  }

  return results;
}
