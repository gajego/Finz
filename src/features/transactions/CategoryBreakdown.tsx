import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useWalletStore } from '@/store/useWalletStore';
import { useTheme } from '@/theme/useTheme';

export const CategoryBreakdown: React.FC = () => {
  const { colors, mode } = useTheme();
  const categories = useWalletStore((s) => s.categories);
  const transactions = useWalletStore((s) => s.transactions);
  const privacyMode = useWalletStore((s) => s.privacyMode);

  const getCategorySpent = (categoryId: string) => {
    return transactions
      .filter((t) => t.categoryId === categoryId && t.type === 'EXPENSE')
      .reduce((sum, t) => sum + t.amount, 0);
  };

  const formatBRL = (cents: number) => {
    if (privacyMode) return '••••';
    return (cents / 100).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 0,
    });
  };

  return (
    <View style={styles.container}>
      {/* Título da Seção */}
      <View style={styles.sectionHeader}>
        <View>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>METAS & ORÇAMENTOS</Text>
          <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
            Distribuição de capital em tempo real
          </Text>
        </View>
        <Text style={[styles.statusPill, { color: colors.primary, borderColor: colors.primary }]}>
          MÊS ATUAL
        </Text>
      </View>

      {/* Grid Bento Moderno */}
      <View style={styles.grid}>
        {categories.map((cat) => {
          const spent = getCategorySpent(cat.id);
          const percent = Math.min(Math.round((spent / cat.budgetLimit) * 100), 100);
          const isWarning = percent > 85;

          return (
            <View
              key={cat.id}
              style={[
                styles.bentoCard,
                {
                  backgroundColor: mode === 'dark' ? colors.surface : colors.surfaceElevated,
                  borderColor: isWarning ? 'rgba(255, 59, 48, 0.4)' : colors.border,
                },
              ]}
            >
              <View style={styles.cardHeader}>
                <Text style={[styles.categoryName, { color: colors.text }]}>
                  {cat.name.toUpperCase()}
                </Text>
                <Text
                  style={[
                    styles.percentBadge,
                    {
                      color: isWarning ? colors.danger : colors.primary,
                    },
                  ]}
                >
                  {percent}%
                </Text>
              </View>

              <View style={styles.amountRow}>
                <Text style={[styles.spentText, { color: colors.text }]}>
                  {formatBRL(spent)}
                </Text>
                <Text style={[styles.limitText, { color: colors.textMuted }]}>
                  / {formatBRL(cat.budgetLimit)}
                </Text>
              </View>

              {/* Barra de Progresso Fina e Precisa */}
              <View style={[styles.track, { backgroundColor: colors.surfaceSubtle }]}>
                <View
                  style={[
                    styles.fill,
                    {
                      width: `${percent}%`,
                      backgroundColor: isWarning ? colors.danger : colors.primary,
                    },
                  ]}
                />
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    marginTop: 20,
    marginBottom: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 2,
  },
  sectionSubtitle: {
    fontSize: 11,
    marginTop: 2,
    fontWeight: '500',
  },
  statusPill: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  bentoCard: {
    width: '48.5%',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'space-between',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryName: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  percentBadge: {
    fontSize: 11,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginBottom: 12,
  },
  spentText: {
    fontSize: 16,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  limitText: {
    fontSize: 10,
    fontWeight: '600',
  },
  track: {
    height: 3,
    borderRadius: 1.5,
    overflow: 'hidden',
  },
  fill: {
    height: 3,
    borderRadius: 1.5,
  },
});
