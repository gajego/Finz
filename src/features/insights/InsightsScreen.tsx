import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '@/theme/useTheme';
import { Typography } from '@/theme/typography';
import { FinancialHealthScoreCard } from './FinancialHealthScoreCard';
import { DailyBurnRateCard } from './DailyBurnRateCard';
import { Budget503020Card } from './Budget503020Card';
import { RecurringSubscriptionsCard } from './RecurringSubscriptionsCard';
import { MonthSurplusCard } from './MonthSurplusCard';

interface InsightsScreenProps {
  onNavigateToGoals?: () => void;
}

export const InsightsScreen: React.FC<InsightsScreenProps> = ({ onNavigateToGoals }) => {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header Editorial Neo-Fintech */}
        <View style={styles.header}>
          <Text style={[styles.screenEyebrow, { color: colors.primary }]}>
            INTELIGÊNCIA & ECONOMIA
          </Text>
          <Text style={[styles.screenTitle, { color: colors.text }]}>
            DIAGNÓSTICO
          </Text>
          <Text style={[styles.screenSubtitle, { color: colors.textSecondary }]}>
            Saúde financeira, sobra do mês, ritmo de gastos e otimização
          </Text>
        </View>

        {/* 1. Sobra do Mês (Fechamento 23:59 & Salário Real) */}
        <MonthSurplusCard noMargin onNavigateToGoals={onNavigateToGoals} />

        {/* 2. Termômetro de Saúde Financeira (Score 0 a 100) */}
        <FinancialHealthScoreCard noMargin />

        {/* 3. Cota Diária Segura (Burn Rate / Pacing) */}
        <DailyBurnRateCard noMargin />

        {/* 4. Diagnóstico Estrutural 50 / 30 / 20 */}
        <Budget503020Card noMargin />

        {/* 5. Drenos Silenciosos & Assinaturas Recorrentes */}
        <RecurringSubscriptionsCard noMargin />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 110,
  },
  header: {
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  screenEyebrow: {
    fontSize: 11,
    fontFamily: Typography.bold,
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  screenTitle: {
    fontSize: 26,
    fontFamily: Typography.bold,
    letterSpacing: -0.5,
  },
  screenSubtitle: {
    fontSize: 13,
    fontFamily: Typography.regular,
    marginTop: 4,
    lineHeight: 18,
  },
});
