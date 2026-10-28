import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ShieldCheck, TrendingUp, Target, Sparkles } from 'lucide-react-native';
import { useWalletStore } from '@/store/useWalletStore';
import { useTheme } from '@/theme/useTheme';
import { Typography } from '@/theme/typography';
import { calculateFinancialHealthScore } from './insightsEngine';

interface FinancialHealthScoreCardProps {
  noMargin?: boolean;
}

export const FinancialHealthScoreCard: React.FC<FinancialHealthScoreCardProps> = ({ noMargin }) => {
  const { colors, mode } = useTheme();
  const isDark = mode === 'dark';
  const transactions = useWalletStore((s) => s.transactions);
  const categories = useWalletStore((s) => s.categories);

  const health = useMemo(() => {
    return calculateFinancialHealthScore(transactions, categories);
  }, [transactions, categories]);

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.borderSubtle,
          marginHorizontal: noMargin ? 0 : 16,
        },
      ]}
    >
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={styles.titleGroup}>
          <View
            style={[
              styles.iconSquircle,
              {
                backgroundColor: `${health.color}18`,
                borderColor: `${health.color}40`,
              },
            ]}
          >
            <ShieldCheck size={18} color={health.color} />
          </View>
          <View>
            <Text style={[styles.eyebrow, { color: colors.textSecondary }]}>
              SAÚDE FINANCEIRA
            </Text>
            <Text style={[styles.title, { color: colors.text }]}>
              Diagnóstico do Mês
            </Text>
          </View>
        </View>

        {/* Score Badge */}
        <View
          style={[
            styles.scorePill,
            {
              backgroundColor: `${health.color}15`,
              borderColor: `${health.color}45`,
            },
          ]}
        >
          <Text style={[styles.scoreValue, { color: health.color }]}>
            {health.score}
          </Text>
          <Text style={[styles.scoreTotal, { color: health.color }]}>/100</Text>
        </View>
      </View>

      {/* Classificação Central */}
      <View style={styles.statusRow}>
        <Text style={[styles.statusLabel, { color: health.color }]}>
          {health.label}
        </Text>
        <Text style={[styles.statusDescription, { color: colors.textSecondary }]}>
          {health.score >= 80
            ? 'Finanças equilibradas com alta disciplina orçamentária.'
            : health.score >= 60
            ? 'Bom controle, com pequenos pontos de otimização.'
            : health.score >= 40
            ? 'Atenção aos limites de gastos e aportes.'
            : 'Despesas superando limites; requer contenção imediata.'}
        </Text>
      </View>

      {/* Sub-métricas Pilares */}
      <View style={styles.metricsRow}>
        <View
          style={[
            styles.metricBox,
            {
              backgroundColor: isDark ? colors.surfaceElevated : colors.background,
              borderColor: colors.borderSubtle,
            },
          ]}
        >
          <View style={styles.metricHeader}>
            <TrendingUp size={12} color={colors.primary} />
            <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>
              Poupança
            </Text>
          </View>
          <Text style={[styles.metricValue, { color: colors.text }]}>
            {health.savingsRate}%
          </Text>
          <Text style={[styles.metricTarget, { color: colors.textMuted }]}>
            Meta ideal: 20%
          </Text>
        </View>

        <View
          style={[
            styles.metricBox,
            {
              backgroundColor: isDark ? colors.surfaceElevated : colors.background,
              borderColor: colors.borderSubtle,
            },
          ]}
        >
          <View style={styles.metricHeader}>
            <Target size={12} color={colors.primary} />
            <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>
              No Teto
            </Text>
          </View>
          <Text style={[styles.metricValue, { color: colors.text }]}>
            {health.budgetComplianceRate}%
          </Text>
          <Text style={[styles.metricTarget, { color: colors.textMuted }]}>
            Metas respeitadas
          </Text>
        </View>
      </View>

      {/* Dicas e Insights Diretos */}
      {health.insights.length > 0 && (
        <View style={styles.insightsList}>
          {health.insights.map((insight, idx) => (
            <View key={idx} style={styles.insightItem}>
              <Sparkles size={11} color={colors.primary} style={{ marginTop: 2, marginRight: 6 }} />
              <Text style={[styles.insightText, { color: colors.textSecondary }]}>
                {insight}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconSquircle: {
    width: 36,
    height: 36,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  eyebrow: {
    fontFamily: Typography.bold,
    fontSize: 9,
    letterSpacing: 0.8,
  },
  title: {
    fontFamily: Typography.bold,
    fontSize: 15,
    marginTop: 1,
  },
  scorePill: {
    flexDirection: 'row',
    alignItems: 'baseline',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
  },
  scoreValue: {
    fontFamily: Typography.bold,
    fontSize: 18,
  },
  scoreTotal: {
    fontFamily: Typography.medium,
    fontSize: 10,
    marginLeft: 2,
  },
  statusRow: {
    marginTop: 12,
  },
  statusLabel: {
    fontFamily: Typography.bold,
    fontSize: 13,
  },
  statusDescription: {
    fontFamily: Typography.regular,
    fontSize: 11,
    marginTop: 2,
    lineHeight: 16,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  metricBox: {
    flex: 1,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metricLabel: {
    fontFamily: Typography.medium,
    fontSize: 10,
  },
  metricValue: {
    fontFamily: Typography.bold,
    fontSize: 18,
    marginTop: 4,
  },
  metricTarget: {
    fontFamily: Typography.regular,
    fontSize: 9,
    marginTop: 2,
  },
  insightsList: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(150, 150, 150, 0.15)',
    gap: 6,
  },
  insightItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  insightText: {
    fontFamily: Typography.regular,
    fontSize: 11,
    lineHeight: 15,
    flex: 1,
  },
});
