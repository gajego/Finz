import type { Transaction, Category } from '@/types';

export interface DailyBurnRateResult {
  totalMonthlyBudget: number; // Centavos
  currentMonthSpent: number; // Centavos
  remainingBudget: number; // Centavos
  daysInMonth: number;
  currentDay: number;
  daysRemaining: number;
  safeDailyQuota: number; // Centavos por dia
  todaySpent: number; // Centavos gastos hoje
  status: 'HEALTHY' | 'ON_LIMIT' | 'OVERPACED' | 'EXCEEDED';
  headline: string;
  subtext: string;
}

export interface FinancialHealthResult {
  score: number; // 0 a 100
  label: 'Excelente' | 'Bom' | 'Atenção' | 'Crítico';
  color: string;
  savingsRate: number; // Porcentagem (ex: 22 para 22%)
  budgetComplianceRate: number; // Porcentagem de categorias dentro do teto
  insights: string[];
}

export type BudgetPilar = 'essential' | 'lifestyle' | 'future';

export interface BudgetPilarData {
  pilar: BudgetPilar;
  label: string;
  idealPercent: number;
  actualPercent: number;
  actualSpent: number; // Centavos
  color: string;
}

export interface Budget503020Result {
  totalConsideredSpent: number;
  pilares: {
    essential: BudgetPilarData;
    lifestyle: BudgetPilarData;
    future: BudgetPilarData;
  };
  diagnostic: string;
}

export interface RecurringSubscriptionItem {
  id: string;
  merchant: string;
  monthlyAmount: number; // Centavos
  annualAmount: number; // Centavos
  lastDate: number;
  categoryName?: string;
  categoryColor?: string;
}

export interface RecurringDetectorResult {
  items: RecurringSubscriptionItem[];
  totalMonthly: number; // Centavos
  totalAnnual: number; // Centavos
}

// Auxiliar de data no fuso de Brasília
function getBrazilParts(ts: number = Date.now()) {
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
 * SQUAD 1: RITMO DIÁRIO (BURN RATE / PACING)
 * Calcula a cota diária segura de gasto até o último dia do mês.
 */
export function calculateDailyBurnRate(
  transactions: Transaction[],
  categories: Category[]
): DailyBurnRateResult {
  const now = Date.now();
  const { day: currentDay, month, year } = getBrazilParts(now);
  const startOfMonth = new Date(year, month, 1).getTime();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const endOfMonth = new Date(year, month, daysInMonth, 23, 59, 59, 999).getTime();

  // Início e fim do dia de hoje (Brasília)
  const startOfToday = new Date(year, month, currentDay).getTime();
  const endOfToday = new Date(year, month, currentDay, 23, 59, 59, 999).getTime();

  const consideredCats = categories.filter((c) => c.considerar !== false);
  const consideredIds = new Set(consideredCats.map((c) => c.id));
  const totalMonthlyBudget = consideredCats.reduce((sum, c) => sum + (c.budgetLimit || 0), 0);

  let currentMonthSpent = 0;
  let todaySpent = 0;

  for (const t of transactions) {
    if (t.type !== 'EXPENSE' && t.type !== 'PIX_OUT') continue;
    if (!consideredIds.has(t.categoryId)) continue;

    if (t.timestamp >= startOfMonth && t.timestamp <= endOfMonth) {
      currentMonthSpent += t.amount;
    }
    if (t.timestamp >= startOfToday && t.timestamp <= endOfToday) {
      todaySpent += t.amount;
    }
  }

  const remainingBudget = Math.max(0, totalMonthlyBudget - currentMonthSpent);
  const daysRemaining = Math.max(1, daysInMonth - currentDay + 1);
  const safeDailyQuota = totalMonthlyBudget > 0
    ? Math.max(0, Math.round(remainingBudget / daysRemaining))
    : 0;

  let status: DailyBurnRateResult['status'] = 'HEALTHY';
  let headline = 'Ritmo excelente';
  let subtext = `Restam ${daysRemaining} dias no mês com margem segura.`;

  if (totalMonthlyBudget > 0 && currentMonthSpent >= totalMonthlyBudget) {
    status = 'EXCEEDED';
    headline = 'Orçamento mensal esgotado';
    subtext = 'Evite novos gastos não essenciais até o próximo mês.';
  } else if (safeDailyQuota > 0 && todaySpent > safeDailyQuota * 1.3) {
    status = 'OVERPACED';
    headline = 'Acima da cota hoje';
    subtext = 'O ritmo de hoje reduz a cota dos próximos dias.';
  } else if (safeDailyQuota > 0 && todaySpent >= safeDailyQuota * 0.9) {
    status = 'ON_LIMIT';
    headline = 'Cota diária quase atingida';
    subtext = 'Mantenha os gastos contidos pelo resto do dia.';
  }

  return {
    totalMonthlyBudget,
    currentMonthSpent,
    remainingBudget,
    daysInMonth,
    currentDay,
    daysRemaining,
    safeDailyQuota,
    todaySpent,
    status,
    headline,
    subtext,
  };
}

/**
 * SQUAD 2: TERMÔMETRO DE SAÚDE FINANCEIRA (SCORE 0 A 100)
 * Pondera poupança (40%), disciplina orçamentária (40%) e estabilidade (20%).
 */
export function calculateFinancialHealthScore(
  transactions: Transaction[],
  categories: Category[]
): FinancialHealthResult {
  const now = Date.now();
  const { month, year } = getBrazilParts(now);
  const startOfMonth = new Date(year, month, 1).getTime();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const endOfMonth = new Date(year, month, daysInMonth, 23, 59, 59, 999).getTime();

  const consideredCats = categories.filter((c) => c.considerar !== false);
  const consideredIds = new Set(consideredCats.map((c) => c.id));

  let totalIncome = 0;
  let totalExpense = 0;
  const catSpentMap: Record<string, number> = {};

  for (const t of transactions) {
    if (t.timestamp < startOfMonth || t.timestamp > endOfMonth) continue;

    if (t.type === 'PIX_IN' || t.type === 'REFUND') {
      totalIncome += t.amount;
    } else if (t.type === 'EXPENSE' || t.type === 'PIX_OUT') {
      if (consideredIds.has(t.categoryId)) {
        totalExpense += t.amount;
        catSpentMap[t.categoryId] = (catSpentMap[t.categoryId] || 0) + t.amount;
      }
    }
  }

  // 1. Pilar Poupança (40 pts)
  let savingsScore = 0;
  let savingsRate = 0;
  if (totalIncome > 0) {
    const saved = totalIncome - totalExpense;
    savingsRate = Math.round((saved / totalIncome) * 100);
    if (savingsRate >= 20) {
      savingsScore = 40;
    } else if (savingsRate > 0) {
      savingsScore = Math.round((savingsRate / 20) * 40);
    } else {
      savingsScore = 0;
    }
  } else {
    // Se não há receita registrada, avalia se o gasto está abaixo do teto
    const totalBudget = consideredCats.reduce((sum, c) => sum + (c.budgetLimit || 0), 0);
    if (totalBudget > 0) {
      const ratio = totalExpense / totalBudget;
      savingsScore = ratio <= 0.8 ? 35 : ratio <= 1 ? 25 : 10;
      savingsRate = Math.round(Math.max(0, 1 - ratio) * 100);
    } else {
      savingsScore = 25;
      savingsRate = 0;
    }
  }

  // 2. Pilar Disciplina de Tetos (40 pts)
  const catsWithBudget = consideredCats.filter((c) => (c.budgetLimit || 0) > 0);
  let compliantCount = 0;
  for (const cat of catsWithBudget) {
    const spent = catSpentMap[cat.id] || 0;
    if (spent <= cat.budgetLimit) {
      compliantCount++;
    }
  }
  const budgetComplianceRate = catsWithBudget.length > 0
    ? Math.round((compliantCount / catsWithBudget.length) * 100)
    : 100;
  const budgetScore = Math.round((budgetComplianceRate / 100) * 40);

  // 3. Pilar Ritmo e Estabilidade (20 pts)
  const { day: currentDay } = getBrazilParts(now);
  const expectedPacing = currentDay / daysInMonth;
  const totalBudget = consideredCats.reduce((sum, c) => sum + (c.budgetLimit || 0), 0);
  let pacingScore = 20;
  if (totalBudget > 0) {
    const actualPacing = totalExpense / totalBudget;
    if (actualPacing > expectedPacing * 1.25) {
      pacingScore = 5;
    } else if (actualPacing > expectedPacing * 1.05) {
      pacingScore = 12;
    }
  }

  const finalScore = Math.max(0, Math.min(100, savingsScore + budgetScore + pacingScore));

  let label: FinancialHealthResult['label'] = 'Excelente';
  let color = '#10B981';
  if (finalScore < 40) {
    label = 'Crítico';
    color = '#EF4444';
  } else if (finalScore < 65) {
    label = 'Atenção';
    color = '#F59E0B';
  } else if (finalScore < 80) {
    label = 'Bom';
    color = '#3B82F6';
  }

  const insights: string[] = [];
  if (savingsRate >= 20) {
    insights.push(`Poupança forte: você reteve ${savingsRate}% da renda neste mês.`);
  } else if (savingsRate > 0) {
    insights.push(`Taxa de poupança em ${savingsRate}%. A meta ideal recomendada é 20%.`);
  } else if (totalIncome > 0) {
    insights.push('Despesas superaram as receitas do mês. Atenção aos aportes.');
  }

  if (catsWithBudget.length > 0) {
    if (compliantCount === catsWithBudget.length) {
      insights.push(`100% das suas ${catsWithBudget.length} metas de orçamento estão no teto.`);
    } else {
      const overCount = catsWithBudget.length - compliantCount;
      insights.push(`${overCount} categoria${overCount > 1 ? 's estouraram' : ' estourou'} o teto mensal.`);
    }
  }

  return {
    score: finalScore,
    label,
    color,
    savingsRate,
    budgetComplianceRate,
    insights,
  };
}

/**
 * SQUAD 3: DIAGNÓSTICO ESTRUTURAL 50/30/20
 * Classifica despesas em Essenciais (50%), Estilo de Vida (30%) e Futuro (20%).
 */
export function classifyCategoryPilar(cat: Category): BudgetPilar {
  const norm = `${cat.id} ${cat.name}`.toLowerCase();

  // Futuro / Investimentos
  if (
    norm.includes('invest') ||
    norm.includes('poupan') ||
    norm.includes('reserva') ||
    norm.includes('aporte') ||
    norm.includes('ações') ||
    norm.includes('cripto')
  ) {
    return 'future';
  }

  // Essenciais
  if (
    norm.includes('food') ||
    norm.includes('aliment') ||
    norm.includes('mercado') ||
    norm.includes('supermercado') ||
    norm.includes('transport') ||
    norm.includes('combust') ||
    norm.includes('posto') ||
    norm.includes('saude') ||
    norm.includes('saúde') ||
    norm.includes('farmacia') ||
    norm.includes('farmácia') ||
    norm.includes('moradia') ||
    norm.includes('casa') ||
    norm.includes('aluguel') ||
    norm.includes('condominio') ||
    norm.includes('luz') ||
    norm.includes('energia') ||
    norm.includes('agua') ||
    norm.includes('água') ||
    norm.includes('conta') ||
    norm.includes('educa') ||
    norm.includes('escola')
  ) {
    return 'essential';
  }

  // Estilo de Vida (Lazer, Compras, Delivery, Bares, Jogos, etc.)
  return 'lifestyle';
}

export function calculateBudget503020(
  transactions: Transaction[],
  categories: Category[]
): Budget503020Result {
  const now = Date.now();
  const { month, year } = getBrazilParts(now);
  const startOfMonth = new Date(year, month, 1).getTime();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const endOfMonth = new Date(year, month, daysInMonth, 23, 59, 59, 999).getTime();

  const consideredCats = categories.filter((c) => c.considerar !== false);
  const catPilarMap = new Map<string, BudgetPilar>();
  for (const c of consideredCats) {
    catPilarMap.set(c.id, classifyCategoryPilar(c));
  }

  let essentialSpent = 0;
  let lifestyleSpent = 0;
  let futureSpent = 0;

  for (const t of transactions) {
    if (t.type !== 'EXPENSE' && t.type !== 'PIX_OUT') continue;
    if (t.timestamp < startOfMonth || t.timestamp > endOfMonth) continue;

    const pilar = catPilarMap.get(t.categoryId);
    if (!pilar) continue;

    if (pilar === 'essential') essentialSpent += t.amount;
    else if (pilar === 'lifestyle') lifestyleSpent += t.amount;
    else if (pilar === 'future') futureSpent += t.amount;
  }

  const totalConsideredSpent = essentialSpent + lifestyleSpent + futureSpent;

  const essentialPercent = totalConsideredSpent > 0 ? Math.round((essentialSpent / totalConsideredSpent) * 100) : 0;
  const lifestylePercent = totalConsideredSpent > 0 ? Math.round((lifestyleSpent / totalConsideredSpent) * 100) : 0;
  const futurePercent = totalConsideredSpent > 0 ? Math.max(0, 100 - essentialPercent - lifestylePercent) : 0;

  let diagnostic = 'Distribuição estrutural equilibrada.';
  if (essentialPercent > 65) {
    diagnostic = 'Custos essenciais altos comprimindo sua capacidade de poupança.';
  } else if (lifestylePercent > 45) {
    diagnostic = 'Estilo de vida acima de 45%: grande oportunidade de corte em lazer/delivery.';
  } else if (futurePercent >= 20) {
    diagnostic = 'Excelente! Você atinge ou supera a meta de 20% em aportes futuros.';
  }

  return {
    totalConsideredSpent,
    pilares: {
      essential: {
        pilar: 'essential',
        label: 'Necessidades',
        idealPercent: 50,
        actualPercent: essentialPercent,
        actualSpent: essentialSpent,
        color: '#3B82F6', // Azul
      },
      lifestyle: {
        pilar: 'lifestyle',
        label: 'Estilo de Vida',
        idealPercent: 30,
        actualPercent: lifestylePercent,
        actualSpent: lifestyleSpent,
        color: '#EC4899', // Rosa
      },
      future: {
        pilar: 'future',
        label: 'Investimentos',
        idealPercent: 20,
        actualPercent: futurePercent,
        actualSpent: futureSpent,
        color: '#10B981', // Verde
      },
    },
    diagnostic,
  };
}

/**
 * SQUAD 4: DETECTOR DE ASSINATURAS E RECORRÊNCIAS
 * Identifica cobranças mensais repetidas para conscientização e corte imediato.
 */
export function detectRecurringExpenses(
  transactions: Transaction[],
  categories: Category[]
): RecurringDetectorResult {
  const catMap = new Map(categories.map((c) => [c.id, c]));

  // Normalizador de nome de estabelecimento
  const normalize = (m: string) => {
    return (m || '')
      .toLowerCase()
      .replace(/[\d/.\-_*#]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const knownKeywords = [
    'netflix', 'spotify', 'amazon', 'prime', 'apple', 'google', 'youtube',
    'disney', 'hbo', 'max', 'paramount', 'deezer', 'openai', 'chatgpt',
    'claro', 'vivo', 'tim', 'gym', 'smart fit', 'bluefit', 'ifood clube',
    'globo', 'crunchyroll', 'playstation', 'xbox', 'microsoft', 'adobe',
  ];

  // Agrupamento por merchant normalizado
  const grouped = new Map<string, { txs: Transaction[]; merchant: string }>();

  for (const t of transactions) {
    if (t.type !== 'EXPENSE' && t.type !== 'PIX_OUT') continue;
    const norm = normalize(t.merchant);
    if (!norm) continue;

    const entry = grouped.get(norm) || { txs: [], merchant: t.merchant };
    entry.txs.push(t);
    grouped.set(norm, entry);
  }

  const items: RecurringSubscriptionItem[] = [];

  for (const [norm, { txs, merchant }] of grouped.entries()) {
    const isKnown = knownKeywords.some((kw) => norm.includes(kw));

    // Se é serviço conhecido ou se repetiu em momentos diferentes com valor similar
    if (isKnown || txs.length >= 2) {
      // Ordena pelas mais recentes
      txs.sort((a, b) => b.timestamp - a.timestamp);
      const latest = txs[0];
      const monthlyAmount = latest.amount;
      const annualAmount = monthlyAmount * 12;
      const cat = catMap.get(latest.categoryId);

      items.push({
        id: `rec_${norm.slice(0, 16)}`,
        merchant: merchant.charAt(0).toUpperCase() + merchant.slice(1),
        monthlyAmount,
        annualAmount,
        lastDate: latest.timestamp,
        categoryName: cat?.name,
        categoryColor: cat?.color,
      });
    }
  }

  // Ordena pelo maior valor anual
  items.sort((a, b) => b.annualAmount - a.annualAmount);

  const totalMonthly = items.reduce((sum, item) => sum + item.monthlyAmount, 0);
  const totalAnnual = totalMonthly * 12;

  return {
    items,
    totalMonthly,
    totalAnnual,
  };
}
