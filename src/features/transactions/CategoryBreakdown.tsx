import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Sliders, AlertTriangle } from 'lucide-react-native';
import { useWalletStore } from '@/store/useWalletStore';
import { useTheme } from '@/theme/useTheme';
import { Typography } from '@/theme/typography';



interface CategoryBreakdownProps {
  onOpenBudgetManager: (categoryId?: string) => void;
}

export const CategoryBreakdown: React.FC<CategoryBreakdownProps> = ({ onOpenBudgetManager }) => {
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
      {/* Título da Seção e Botão de Gestão */}
      <View style={styles.sectionHeader}>
        <View>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>METAS & TETOS MENSAIS</Text>
          <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
            Toque em uma categoria para ajustar o limite
          </Text>
        </View>

        <Pressable
          onPress={() => onOpenBudgetManager()}
          style={[
            styles.configButton,
            { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
          ]}
        >
          <Sliders size={12} color={colors.primary} />
          <Text style={[styles.configButtonText, { color: colors.text }]}>AJUSTAR</Text>
        </Pressable>
      </View>

      {/* Grid Bento com Alertas Visuais Vermelhos */}
      <View style={styles.grid}>
        {categories.map((cat) => {
          const spent = getCategorySpent(cat.id);
          const percent = Math.min(Math.round((spent / cat.budgetLimit) * 100), 200);
          const isWarning = percent >= 85;
          const isExceeded = percent >= 100;

          return (
            <Pressable
              key={cat.id}
              onPress={() => onOpenBudgetManager(cat.id)}
              style={[
                styles.bentoCard,
                {
                  backgroundColor: isWarning
                    ? 'rgba(255, 59, 48, 0.08)'
                    : mode === 'dark'
                    ? colors.surface
                    : colors.surfaceElevated,
                  borderColor: isWarning ? '#FF3B30' : colors.border,
                },
              ]}
            >
              <View style={styles.cardHeader}>
                <View style={styles.nameWithIcon}>
                  {isWarning && <AlertTriangle size={12} color="#FF3B30" />}
                  <Text
                    style={[
                      styles.categoryName,
                      { color: isWarning ? '#FF3B30' : colors.text },
                    ]}
                  >
                    {cat.name.toUpperCase()}
                  </Text>
                </View>

                <View
                  style={[
                    styles.percentBadge,
                    isWarning && { backgroundColor: 'rgba(255, 59, 48, 0.2)' },
                  ]}
                >
                  <Text
                    style={[
                      styles.percentText,
                      { color: isWarning ? '#FF3B30' : colors.primary },
                    ]}
                  >
                    {percent}%
                  </Text>
                </View>
              </View>

              <View style={styles.amountRow}>
                <Text
                  style={[
                    styles.spentText,
                    { color: isWarning ? '#FF3B30' : colors.text },
                  ]}
                >
                  {formatBRL(spent)}
                </Text>
                <Text style={[styles.limitText, { color: colors.textMuted }]}>
                  / {formatBRL(cat.budgetLimit)}
                </Text>
              </View>

              {/* Medidor com Padrão Vermelho em Alerta */}
              <View style={[styles.track, { backgroundColor: colors.surfaceSubtle }]}>
                <View
                  style={[
                    styles.fill,
                    {
                      width: `${Math.min(percent, 100)}%`,
                      backgroundColor: isWarning ? '#FF3B30' : colors.primary,
                    },
                  ]}
                />
              </View>
            </Pressable>
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
    fontFamily: Typography.bold,
    fontSize: 12,
    letterSpacing: 2,
  },
  sectionSubtitle: {
    fontFamily: Typography.regular,
    fontSize: 11,
    marginTop: 2,
  },
  configButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  configButtonText: {
    fontFamily: Typography.bold,
    fontSize: 10,
    letterSpacing: 0.8,
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
  nameWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  categoryName: {
    fontFamily: Typography.bold,
    fontSize: 10,
    letterSpacing: 0.8,
  },
  percentBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  percentText: {
    fontFamily: Typography.bold,
    fontSize: 11,
    fontVariant: ['tabular-nums'],
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginBottom: 12,
  },
  spentText: {
    fontFamily: Typography.bold,
    fontSize: 16,
    fontVariant: ['tabular-nums'],
  },
  limitText: {
    fontFamily: Typography.regular,
    fontSize: 10,
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
