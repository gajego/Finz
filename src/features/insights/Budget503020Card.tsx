import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { PieChart, Info } from 'lucide-react-native';
import { useWalletStore } from '@/store/useWalletStore';
import { useTheme } from '@/theme/useTheme';
import { Typography } from '@/theme/typography';
import { formatBRL } from '@/features/transactions/transactionUtils';
import { calculateBudget503020 } from './insightsEngine';

interface Budget503020CardProps {
  noMargin?: boolean;
}

export const Budget503020Card: React.FC<Budget503020CardProps> = ({ noMargin }) => {
  const { colors, mode } = useTheme();
  const isDark = mode === 'dark';
  const transactions = useWalletStore((s) => s.transactions);
  const categories = useWalletStore((s) => s.categories);
  const privacyMode = useWalletStore((s) => s.privacyMode);

  const data = useMemo(() => {
    return calculateBudget503020(transactions, categories);
  }, [transactions, categories]);

  if (data.totalConsideredSpent <= 0) {
    return null;
  }

  const { essential, lifestyle, future } = data.pilares;

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
                backgroundColor: isDark ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.1)',
                borderColor: 'rgba(59, 130, 246, 0.35)',
              },
            ]}
          >
            <PieChart size={18} color="#3B82F6" />
          </View>
          <View>
            <Text style={[styles.eyebrow, { color: colors.textSecondary }]}>
              REGRA 50 / 30 / 20
            </Text>
            <Text style={[styles.title, { color: colors.text }]}>
              Equilíbrio Estrutural
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.totalBadge,
            {
              backgroundColor: isDark ? colors.surfaceElevated : colors.background,
              borderColor: colors.borderSubtle,
            },
          ]}
        >
          <Text style={[styles.totalLabel, { color: colors.textMuted }]}>Total Mês</Text>
          <Text style={[styles.totalValue, { color: colors.text }]}>
            {formatBRL(data.totalConsideredSpent, privacyMode)}
          </Text>
        </View>
      </View>

      {/* Barra Segmentada Tri-color */}
      <View style={styles.segmentedBar}>
        <View
          style={[
            styles.barSegment,
            {
              flex: Math.max(0.01, essential.actualPercent),
              backgroundColor: essential.color,
              borderTopLeftRadius: 4,
              borderBottomLeftRadius: 4,
            },
          ]}
        />
        <View
          style={[
            styles.barSegment,
            {
              flex: Math.max(0.01, lifestyle.actualPercent),
              backgroundColor: lifestyle.color,
            },
          ]}
        />
        <View
          style={[
            styles.barSegment,
            {
              flex: Math.max(0.01, future.actualPercent),
              backgroundColor: future.color,
              borderTopRightRadius: 4,
              borderBottomRightRadius: 4,
            },
          ]}
        />
      </View>

      {/* Cards dos 3 Pilares */}
      <View style={styles.pillarsGrid}>
        {/* Essenciais */}
        <View
          style={[
            styles.pillarCard,
            {
              backgroundColor: isDark ? colors.surfaceElevated : colors.background,
              borderColor: colors.borderSubtle,
            },
          ]}
        >
          <View style={styles.pillarHeader}>
            <View style={[styles.dot, { backgroundColor: essential.color }]} />
            <Text style={[styles.pillarName, { color: colors.text }]}>
              {essential.label}
            </Text>
          </View>
          <Text style={[styles.pillarPercent, { color: essential.color }]}>
            {essential.actualPercent}%
          </Text>
          <Text style={[styles.pillarIdeal, { color: colors.textMuted }]}>
            Ideal: 50%
          </Text>
          <Text style={[styles.pillarAmount, { color: colors.textSecondary }]}>
            {formatBRL(essential.actualSpent, privacyMode)}
          </Text>
        </View>

        {/* Estilo de Vida */}
        <View
          style={[
            styles.pillarCard,
            {
              backgroundColor: isDark ? colors.surfaceElevated : colors.background,
              borderColor: colors.borderSubtle,
            },
          ]}
        >
          <View style={styles.pillarHeader}>
            <View style={[styles.dot, { backgroundColor: lifestyle.color }]} />
            <Text style={[styles.pillarName, { color: colors.text }]}>
              {lifestyle.label}
            </Text>
          </View>
          <Text style={[styles.pillarPercent, { color: lifestyle.color }]}>
            {lifestyle.actualPercent}%
          </Text>
          <Text style={[styles.pillarIdeal, { color: colors.textMuted }]}>
            Ideal: 30%
          </Text>
          <Text style={[styles.pillarAmount, { color: colors.textSecondary }]}>
            {formatBRL(lifestyle.actualSpent, privacyMode)}
          </Text>
        </View>

        {/* Futuro / Investimentos */}
        <View
          style={[
            styles.pillarCard,
            {
              backgroundColor: isDark ? colors.surfaceElevated : colors.background,
              borderColor: colors.borderSubtle,
            },
          ]}
        >
          <View style={styles.pillarHeader}>
            <View style={[styles.dot, { backgroundColor: future.color }]} />
            <Text style={[styles.pillarName, { color: colors.text }]}>
              {future.label}
            </Text>
          </View>
          <Text style={[styles.pillarPercent, { color: future.color }]}>
            {future.actualPercent}%
          </Text>
          <Text style={[styles.pillarIdeal, { color: colors.textMuted }]}>
            Ideal: 20%
          </Text>
          <Text style={[styles.pillarAmount, { color: colors.textSecondary }]}>
            {formatBRL(future.actualSpent, privacyMode)}
          </Text>
        </View>
      </View>

      {/* Diagnóstico em Texto */}
      <View style={styles.diagnosticRow}>
        <Info size={12} color={colors.textSecondary} style={{ marginTop: 2, marginRight: 6 }} />
        <Text style={[styles.diagnosticText, { color: colors.textSecondary }]}>
          {data.diagnostic}
        </Text>
      </View>
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
  totalBadge: {
    alignItems: 'flex-end',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  totalLabel: {
    fontFamily: Typography.medium,
    fontSize: 9,
  },
  totalValue: {
    fontFamily: Typography.bold,
    fontSize: 12,
  },
  segmentedBar: {
    height: 8,
    flexDirection: 'row',
    borderRadius: 4,
    overflow: 'hidden',
    marginTop: 14,
    backgroundColor: 'rgba(150, 150, 150, 0.15)',
  },
  barSegment: {
    height: '100%',
  },
  pillarsGrid: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  pillarCard: {
    flex: 1,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  pillarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  pillarName: {
    fontFamily: Typography.bold,
    fontSize: 10,
  },
  pillarPercent: {
    fontFamily: Typography.bold,
    fontSize: 16,
    marginTop: 4,
  },
  pillarIdeal: {
    fontFamily: Typography.medium,
    fontSize: 9,
    marginTop: 1,
  },
  pillarAmount: {
    fontFamily: Typography.regular,
    fontSize: 10,
    marginTop: 4,
  },
  diagnosticRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(150, 150, 150, 0.15)',
  },
  diagnosticText: {
    fontFamily: Typography.regular,
    fontSize: 11,
    lineHeight: 15,
    flex: 1,
  },
});
