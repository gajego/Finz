import {
  calculateDailyBurnRate,
  calculateFinancialHealthScore,
  calculateBudget503020,
  detectRecurringExpenses,
} from '../insightsEngine';
import type { Transaction, Category } from '@/types';

// Self-check assert script
function runSelfCheck() {
  console.log('[insightsEngine.test] Iniciando verificação dos cálculos econômicos...');

  const mockCategories: Category[] = [
    { id: 'cat_food', name: 'Alimentação', icon: 'utensils', color: '#F59E0B', budgetLimit: 200000, considerar: true },
    { id: 'cat_transport', name: 'Transporte', icon: 'car', color: '#3B82F6', budgetLimit: 100000, considerar: true },
    { id: 'cat_leisure', name: 'Lazer', icon: 'gamepad-2', color: '#EC4899', budgetLimit: 50000, considerar: true },
    { id: 'cat_investments', name: 'Investimentos', icon: 'trending-up', color: '#10B981', budgetLimit: 50000, considerar: true },
    { id: 'cat_ignored', name: 'Desconsiderada', icon: 'x', color: '#999999', budgetLimit: 100000, considerar: false },
  ];

  const now = Date.now();
  const mockTransactions: Transaction[] = [
    { id: 't1', cardId: 'c1', amount: 50000, type: 'EXPENSE', merchant: 'Supermercado Dia', categoryId: 'cat_food', timestamp: now },
    { id: 't2', cardId: 'c1', amount: 20000, type: 'EXPENSE', merchant: 'Uber Viagem', categoryId: 'cat_transport', timestamp: now },
    { id: 't3', cardId: 'c1', amount: 30000, type: 'EXPENSE', merchant: 'Cinema', categoryId: 'cat_leisure', timestamp: now },
    { id: 't4', cardId: 'c1', amount: 40000, type: 'EXPENSE', merchant: 'Aporte CDB', categoryId: 'cat_investments', timestamp: now },
    { id: 't5', cardId: 'c1', amount: 500000, type: 'PIX_IN', merchant: 'Salário', categoryId: 'cat_food', timestamp: now },
    // Transações recorrentes simuladas
    { id: 't6', cardId: 'c1', amount: 3990, type: 'EXPENSE', merchant: 'Netflix.com', categoryId: 'cat_leisure', timestamp: now },
    { id: 't7', cardId: 'c1', amount: 3990, type: 'EXPENSE', merchant: 'Netflix.com', categoryId: 'cat_leisure', timestamp: now - 30 * 86400000 },
    { id: 't8', cardId: 'c1', amount: 2190, type: 'EXPENSE', merchant: 'Spotify Premium', categoryId: 'cat_leisure', timestamp: now },
  ];

  // Teste 1: Burn Rate
  const burn = calculateDailyBurnRate(mockTransactions, mockCategories);
  if (burn.totalMonthlyBudget !== 400000) {
    throw new Error(`BurnRate budget mismatch. Expected 400000, got ${burn.totalMonthlyBudget}`);
  }
  if (burn.safeDailyQuota <= 0) {
    throw new Error(`BurnRate safeDailyQuota should be positive. Got ${burn.safeDailyQuota}`);
  }
  console.log('✓ Squad 1 (Burn Rate / Pacing) validado.');

  // Teste 2: Health Score
  const health = calculateFinancialHealthScore(mockTransactions, mockCategories);
  if (health.score < 0 || health.score > 100) {
    throw new Error(`Health score out of range: ${health.score}`);
  }
  console.log(`✓ Squad 2 (Health Score: ${health.score}/100 - ${health.label}) validado.`);

  // Teste 3: 50/30/20
  const b50 = calculateBudget503020(mockTransactions, mockCategories);
  if (b50.pilares.essential.actualSpent <= 0) {
    throw new Error('50/30/20 Essential spent should be > 0');
  }
  if (b50.pilares.future.actualSpent <= 0) {
    throw new Error('50/30/20 Future spent should be > 0');
  }
  console.log('✓ Squad 3 (50/30/20 Diagnostic) validado.');

  // Teste 4: Recurring Subscriptions
  const rec = detectRecurringExpenses(mockTransactions, mockCategories);
  if (rec.items.length === 0) {
    throw new Error('Recurring detector should have found Netflix or Spotify');
  }
  console.log(`✓ Squad 4 (Recurring Subscriptions: ${rec.items.length} detectadas, total R$ ${rec.totalMonthly / 100}/mês) validado.`);

  console.log('🎉 Todos os 4 Squads Econômicos passaram com sucesso nos testes unitários!');
}

runSelfCheck();
