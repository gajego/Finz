import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { RefreshCw, Calendar, AlertCircle } from 'lucide-react-native';
import { useWalletStore } from '@/store/useWalletStore';
import { useTheme } from '@/theme/useTheme';
import { Typography } from '@/theme/typography';
import { formatBRL } from '@/features/transactions/transactionUtils';
import { detectRecurringExpenses } from './insightsEngine';

interface RecurringSubscriptionsCardProps {
  noMargin?: boolean;
}

export const RecurringSubscriptionsCard: React.FC<RecurringSubscriptionsCardProps> = ({ noMargin }) => {
  const { colors, mode } = useTheme();
  const isDark = mode === 'dark';
  const transactions = useWalletStore((s) => s.transactions);
  const categories = useWalletStore((s) => s.categories);
  const privacyMode = useWalletStore((s) => s.privacyMode);

  const recurring = useMemo(() => {
    return detectRecurringExpenses(transactions, categories);
  }, [transactions, categories]);

  if (recurring.items.length === 0) {
    return null;
  }

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
                backgroundColor: isDark ? 'rgba(236, 72, 153, 0.15)' : 'rgba(236, 72, 153, 0.1)',
                borderColor: 'rgba(236, 72, 153, 0.35)',
              },
            ]}
          >
            <RefreshCw size={18} color="#EC4899" />
          </View>
          <View>
            <Text style={[styles.eyebrow, { color: colors.textSecondary }]}>
              DRENOS SILENCIOSOS
            </Text>
            <Text style={[styles.title, { color: colors.text }]}>
              Assinaturas & Recorrências
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.countBadge,
            {
              backgroundColor: isDark ? colors.surfaceElevated : colors.background,
              borderColor: colors.borderSubtle,
            },
          ]}
        >
          <Text style={[styles.countText, { color: colors.textSecondary }]}>
            {recurring.items.length} ativas
          </Text>
        </View>
      </View>

      {/* Banner de Impacto Anualizado */}
      <View
        style={[
          styles.impactBanner,
          {
            backgroundColor: isDark ? colors.surfaceElevated : colors.background,
            borderColor: colors.borderSubtle,
          },
        ]}
      >
        <View>
          <Text style={[styles.impactLabel, { color: colors.textMuted }]}>
            Impacto Mensal
          </Text>
          <Text style={[styles.impactValue, { color: colors.text }]}>
            {formatBRL(recurring.totalMonthly, privacyMode)}
            <Text style={[styles.impactUnit, { color: colors.textSecondary }]}> /mês</Text>
          </Text>
        </View>

        <View style={styles.verticalDivider} />

        <View>
          <Text style={[styles.impactLabel, { color: colors.textMuted }]}>
            Projeção em 12 Meses
          </Text>
          <Text style={[styles.impactValueAnnual, { color: '#EC4899' }]}>
            {formatBRL(recurring.totalAnnual, privacyMode)}
            <Text style={[styles.impactUnit, { color: colors.textSecondary }]}> /ano</Text>
          </Text>
        </View>
      </View>

      {/* Lista de Assinaturas Detectadas */}
      <View style={styles.itemsList}>
        {recurring.items.slice(0, 5).map((item) => (
          <View
            key={item.id}
            style={[
              styles.itemRow,
              { borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)' },
            ]}
          >
            <View style={styles.itemInfo}>
              <Text style={[styles.itemName, { color: colors.text }]} numberOfLines={1}>
                {item.merchant}
              </Text>
              <View style={styles.itemMeta}>
                <Calendar size={10} color={colors.textMuted} />
                <Text style={[styles.itemDate, { color: colors.textMuted }]}>
                  {new Date(item.lastDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                </Text>
                {item.categoryName && (
                  <Text style={[styles.itemCategory, { color: item.categoryColor || colors.textMuted }]}>
                    • {item.categoryName}
                  </Text>
                )}
              </View>
            </View>

            <View style={styles.itemAmountBox}>
              <Text style={[styles.itemAmount, { color: colors.text }]}>
                {formatBRL(item.monthlyAmount, privacyMode)}
              </Text>
              <Text style={[styles.itemAnnual, { color: colors.textMuted }]}>
                {formatBRL(item.annualAmount, privacyMode)}/ano
              </Text>
            </View>
          </View>
        ))}
      </View>

      {/* Dica de Economia Imediata */}
      <View style={styles.tipRow}>
        <AlertCircle size={12} color={colors.primary} style={{ marginTop: 2, marginRight: 6 }} />
        <Text style={[styles.tipText, { color: colors.textSecondary }]}>
          Cancelar 1 assinatura subutilizada devolve em média R$ 400 a R$ 1.200/ano para seus aportes.
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
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  countText: {
    fontFamily: Typography.medium,
    fontSize: 10,
  },
  impactBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 14,
  },
  verticalDivider: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(150, 150, 150, 0.2)',
  },
  impactLabel: {
    fontFamily: Typography.medium,
    fontSize: 9,
  },
  impactValue: {
    fontFamily: Typography.bold,
    fontSize: 15,
    marginTop: 2,
  },
  impactValueAnnual: {
    fontFamily: Typography.bold,
    fontSize: 15,
    marginTop: 2,
  },
  impactUnit: {
    fontFamily: Typography.regular,
    fontSize: 10,
  },
  itemsList: {
    marginTop: 10,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  itemInfo: {
    flex: 1,
    marginRight: 10,
  },
  itemName: {
    fontFamily: Typography.bold,
    fontSize: 13,
  },
  itemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  itemDate: {
    fontFamily: Typography.regular,
    fontSize: 10,
  },
  itemCategory: {
    fontFamily: Typography.medium,
    fontSize: 10,
  },
  itemAmountBox: {
    alignItems: 'flex-end',
  },
  itemAmount: {
    fontFamily: Typography.bold,
    fontSize: 13,
  },
  itemAnnual: {
    fontFamily: Typography.regular,
    fontSize: 9,
    marginTop: 1,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(150, 150, 150, 0.15)',
  },
  tipText: {
    fontFamily: Typography.regular,
    fontSize: 11,
    lineHeight: 15,
    flex: 1,
  },
});
