import {
  calculateDailyBurnRate,
  calculateFinancialHealthScore,
  calculateBudget503020,
  detectRecurringExpenses,
} from '../insightsEngine';
import {
  calculateRealSalary,
  calculateMonthSurplus,
} from '../monthSurplusService';
import type { Transaction, Category, BankCard } from '@/types';

// Self-check assert script
function runSelfCheck() {
  console.log('[insightsEngine.test] Iniciando auditoria e verificação dos cálculos econômicos...');

  const mockCategories: Category[] = [
    { id: 'cat_food', name: 'Alimentação', icon: 'utensils', color: '#F59E0B', budgetLimit: 200000, considerar: true, pilar: 'essential', isInvestimento: false, type: 'expense' },
    { id: 'cat_transport', name: 'Transporte', icon: 'car', color: '#3B82F6', budgetLimit: 100000, considerar: true, pilar: 'essential', isInvestimento: false, type: 'expense' },
    { id: 'cat_leisure', name: 'Lazer', icon: 'gamepad-2', color: '#EC4899', budgetLimit: 50000, considerar: true, pilar: 'lifestyle', isInvestimento: false, type: 'expense' },
    { id: 'cat_investments', name: 'Investimentos', icon: 'trending-up', color: '#10B981', budgetLimit: 50000, considerar: true, pilar: 'investment', isInvestimento: true, type: 'expense' },
    { id: 'cat_ignored', name: 'Desconsiderada', icon: 'x', color: '#999999', budgetLimit: 100000, considerar: false, pilar: 'lifestyle', isInvestimento: false, type: 'expense' },
    // Nova modelagem de categoria de receita com origem salário:
    { id: 'cat_salary', name: 'Salário Formal', icon: 'coins', color: '#10B981', budgetLimit: 0, considerar: true, type: 'income', incomeType: 'salary' },
    // Categoria de renda extra
    { id: 'cat_extra', name: 'Renda Extra', icon: 'zap', color: '#F59E0B', budgetLimit: 0, considerar: true, type: 'income', incomeType: 'extra' },
  ];

  const now = Date.now();
  const mockTransactions: Transaction[] = [
    { id: 't1', cardId: 'c1', amount: 50000, type: 'EXPENSE', merchant: 'Supermercado Dia', categoryId: 'cat_food', timestamp: now },
    { id: 't2', cardId: 'c1', amount: 20000, type: 'EXPENSE', merchant: 'Uber Viagem', categoryId: 'cat_transport', timestamp: now },
    { id: 't3', cardId: 'c1', amount: 30000, type: 'EXPENSE', merchant: 'Cinema', categoryId: 'cat_leisure', timestamp: now },
    { id: 't4', cardId: 'c1', amount: 40000, type: 'EXPENSE', merchant: 'Aporte CDB', categoryId: 'cat_investments', timestamp: now },
    // Salário recebido via PIX: R$ 4.000,00
    { id: 't5a', cardId: 'c1', amount: 400000, type: 'PIX_IN', merchant: 'Empresa XYZ Salário Pix', categoryId: 'cat_salary', timestamp: now },
    // Salário recebido via TED/Depósito (tipo INCOME): R$ 1.500,00
    { id: 't5b', cardId: 'c1', amount: 150000, type: 'INCOME', merchant: 'Empresa XYZ Salário TED', categoryId: 'cat_salary', timestamp: now },
    // Renda extra via PIX: R$ 800,00
    { id: 't_extra', cardId: 'c1', amount: 80000, type: 'PIX_IN', merchant: 'Freelance Design', categoryId: 'cat_extra', timestamp: now },
    // Estorno no cartão (REFUND): R$ 100,00 -> Não deve inflar receita nem salário
    { id: 't_refund', cardId: 'c1', amount: 10000, type: 'REFUND', merchant: 'Estorno Compra Cancelada', categoryId: 'cat_food', timestamp: now },
    // Transações recorrentes simuladas
    { id: 't6', cardId: 'c1', amount: 3990, type: 'EXPENSE', merchant: 'Netflix.com', categoryId: 'cat_leisure', timestamp: now },
    { id: 't7', cardId: 'c1', amount: 3990, type: 'EXPENSE', merchant: 'Netflix.com', categoryId: 'cat_leisure', timestamp: now - 30 * 86400000 },
    { id: 't8', cardId: 'c1', amount: 2190, type: 'EXPENSE', merchant: 'Spotify Premium', categoryId: 'cat_leisure', timestamp: now },
    // Assinatura cancelada/sem cobrança neste mês (não deve ser considerada)
    { id: 't9', cardId: 'c1', amount: 3490, type: 'EXPENSE', merchant: 'HBO Max', categoryId: 'cat_leisure', timestamp: now - 45 * 86400000 },
    { id: 't10', cardId: 'c1', amount: 3490, type: 'EXPENSE', merchant: 'HBO Max', categoryId: 'cat_leisure', timestamp: now - 75 * 86400000 },
  ];

  // Teste 1: Burn Rate (deve ignorar categorias de income e aplicar estorno)
  const burn = calculateDailyBurnRate(mockTransactions, mockCategories);
  if (burn.totalMonthlyBudget !== 400000) {
    throw new Error(`BurnRate budget mismatch. Expected 400000, got ${burn.totalMonthlyBudget}`);
  }
  if (burn.safeDailyQuota <= 0) {
    throw new Error(`BurnRate safeDailyQuota should be positive. Got ${burn.safeDailyQuota}`);
  }
  console.log('✓ Squad 1 (Burn Rate / Pacing: orçamentos de receitas ignorados corretamente) validado.');

  // Teste 2: Health Score (Estorno de R$ 100 abate despesa e não infla renda)
  const health = calculateFinancialHealthScore(mockTransactions, mockCategories);
  if (health.score < 0 || health.score > 100) {
    throw new Error(`Health score out of range: ${health.score}`);
  }
  console.log(`✓ Squad 2 (Health Score: ${health.score}/100 - ${health.label}) validado.`);

  // Teste 3: 50/30/20 com base na Renda Real Disponível
  const b50 = calculateBudget503020(mockTransactions, mockCategories);
  if (b50.pilares.essential.actualSpent <= 0) {
    throw new Error('50/30/20 Essential spent should be > 0');
  }
  if (b50.pilares.future.actualSpent <= 0) {
    throw new Error('50/30/20 Future spent should be > 0');
  }
  if ((b50.availableIncome || 0) <= 0) {
    throw new Error(`50/30/20 should detect available income. Got ${b50.availableIncome}`);
  }
  console.log(`✓ Squad 3 (50/30/20 Diagnostic com Renda Real Disponível de R$ ${(b50.availableIncome || 0) / 100}) validado.`);

  // Teste 4: Recurring Subscriptions (com filtro de movimentação no mês atual)
  const rec = detectRecurringExpenses(mockTransactions, mockCategories);
  if (rec.items.length === 0) {
    throw new Error('Recurring detector should have found Netflix or Spotify');
  }
  const hasHbo = rec.items.some((i) => i.merchant.toLowerCase().includes('hbo'));
  if (hasHbo) {
    throw new Error('HBO Max was not charged this month and should NOT be considered active!');
  }
  const hasNetflix = rec.items.some((i) => i.merchant.toLowerCase().includes('netflix'));
  if (!hasNetflix) {
    throw new Error('Netflix was charged this month and should be considered active!');
  }
  console.log(`✓ Squad 4 (Recurring Subscriptions: ${rec.items.length} ativas no mês atual, total R$ ${rec.totalMonthly / 100}/mês - HBO Max inativa ignorada com sucesso) validado.`);

  // Teste 5: Salário Real desacoplado (PIX + TED/Depósito, ignorando estornos e despesas)
  const salaryData = calculateRealSalary(mockTransactions, mockCategories, now - 86400000, now + 86400000);
  const expectedSalary = 400000 + 150000; // 550000 centavos = R$ 5.500,00
  if (salaryData.totalSalary !== expectedSalary) {
    throw new Error(`Real salary mismatch. Expected ${expectedSalary}, got ${salaryData.totalSalary}`);
  }
  if (!salaryData.hasSalaryCategory) {
    throw new Error('Should detect salary category');
  }
  console.log(`✓ Squad 5 (Salário Real: R$ ${salaryData.totalSalary / 100} consolidado via PIX e TED sem inflar com estornos) validado.`);

  // Teste 6: Retrocompatibilidade com categorias legadas (isSalario: true sem type: income)
  const legacyCategories: Category[] = [
    { id: 'cat_legacy', name: 'Salário Legado', icon: 'coins', color: '#10B981', budgetLimit: 0, considerar: true, isSalario: true },
  ];
  const legacyTransactions: Transaction[] = [
    { id: 't_leg', cardId: 'c1', amount: 320000, type: 'PIX_IN', merchant: 'Pagamento Salarial', categoryId: 'cat_legacy', timestamp: now },
  ];
  const legacySalary = calculateRealSalary(legacyTransactions, legacyCategories, now - 86400000, now + 86400000);
  if (legacySalary.totalSalary !== 320000) {
    throw new Error(`Legacy salary mismatch. Expected 320000, got ${legacySalary.totalSalary}`);
  }
  console.log('✓ Squad 6 (Retrocompatibilidade com categorias legadas isSalario: true) validado.');

  // Teste 7: Sobra do Mês & Fechamento 23:59 (com estorno abatido e saldo em conta)
  const d = new Date(now);
  const surplus = calculateMonthSurplus(d.getFullYear(), d.getMonth(), mockTransactions, mockCategories, []);
  if (surplus.salaryAmount !== expectedSalary) {
    throw new Error(`MonthSurplus salary mismatch. Expected ${expectedSalary}, got ${surplus.salaryAmount}`);
  }
  if (surplus.netSurplus <= 0) {
    throw new Error(`MonthSurplus netSurplus should be positive. Got ${surplus.netSurplus}`);
  }
  console.log(`✓ Squad 7 (Sobra do Mês: R$ ${surplus.netSurplus / 100} e Receitas Totais R$ ${surplus.totalIncome / 100}) validado.`);

  console.log('🎉 Todos os testes de Auditoria Financeira e Refatoração de Salário passaram com sucesso!');
}

runSelfCheck();
