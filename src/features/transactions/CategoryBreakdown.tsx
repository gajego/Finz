import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useWalletStore } from '@/store/useWalletStore';
import { useTheme } from '@/theme/useTheme';

export const CategoryBreakdown: React.FC = () => {
  const { colors, mode } = useTheme();
  const categories = useWalletStore((s) => s.categories);
  const transactions = useWalletStore((s) => s.transactions);

  // Calcula total gasto por categoria
  const getCategorySpent = (categoryId: string) => {
    return transactions
      .filter((t) => t.categoryId === categoryId && t.type === 'EXPENSE')
      .reduce((sum, t) => sum + t.amount, 0);
  };

  const formatBRL = (cents: number) => {
    return (cents / 100).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: colors.text }]}>Orçamentos por Categoria</Text>
        <Text style={[styles.viewAll, { color: colors.primary }]}>Ver tudo</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {categories.map((cat) => {
          const spent = getCategorySpent(cat.id);
          const percent = Math.min(Math.round((spent / cat.budgetLimit) * 100), 100);

          return (
            <View
              key={cat.id}
              style={[
                styles.categoryCard,
                {
                  backgroundColor: mode === 'dark' ? colors.surface : colors.surfaceElevated,
                  borderColor: colors.border,
                },
              ]}
            >
              <View style={styles.topRow}>
                <View style={[styles.colorDot, { backgroundColor: cat.color }]} />
                <Text style={[styles.categoryName, { color: colors.text }]}>{cat.name}</Text>
              </View>

              <Text style={[styles.spentAmount, { color: colors.text }]}>{formatBRL(spent)}</Text>
              <Text style={[styles.limitLabel, { color: colors.textMuted }]}>
                de {formatBRL(cat.budgetLimit)}
              </Text>

              {/* Barra de Progresso com Cor Dinâmica */}
              <View style={[styles.progressTrack, { backgroundColor: colors.borderLight }]}>
                <View
                  style={[
                    styles.progressBar,
                    {
                      width: `${percent}%`,
                      backgroundColor: percent > 90 ? colors.danger : cat.color,
                    },
                  ]}
                />
              </View>
              <Text style={[styles.percentLabel, { color: colors.textSecondary }]}>
                {percent}% usado
              </Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  viewAll: {
    fontSize: 13,
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: 24,
    gap: 12,
  },
  categoryCard: {
    width: 140,
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  colorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  categoryName: {
    fontSize: 12,
    fontWeight: '700',
  },
  spentAmount: {
    fontSize: 15,
    fontWeight: '800',
  },
  limitLabel: {
    fontSize: 10,
    marginTop: 2,
    marginBottom: 10,
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
  },
  percentLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 6,
    textAlign: 'right',
  },
});
