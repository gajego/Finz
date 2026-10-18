import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import {
  Sliders,
  AlertTriangle,
  Utensils,
  Car,
  Gamepad2,
  TrendingUp,
  ShoppingBag,
  Sparkles,
  Tag,
  Coffee,
  LucideIcon,
} from 'lucide-react-native';
import { useWalletStore } from '@/store/useWalletStore';
import { useTheme } from '@/theme/useTheme';
import { Typography } from '@/theme/typography';

const getCategoryIcon = (iconName: string): LucideIcon => {
  switch (iconName?.toLowerCase()) {
    case 'utensils':
    case 'food':
    case 'alimentação':
      return Utensils;
    case 'car':
    case 'transport':
    case 'transporte':
      return Car;
    case 'gamepad-2':
    case 'gamepad':
    case 'leisure':
    case 'lazer & setup':
      return Gamepad2;
    case 'trending-up':
    case 'investimentos':
    case 'investing':
      return TrendingUp;
    case 'shopping-bag':
    case 'shopping':
    case 'compras':
      return ShoppingBag;
    case 'coffee':
      return Coffee;
    default:
      return Tag;
  }
};

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
          style={({ pressed }) => [
            styles.configButton,
            {
              backgroundColor: colors.surfaceElevated,
              borderColor: colors.border,
              opacity: pressed ? 0.75 : 1,
            },
          ]}
        >
          <Sliders size={12} color={colors.primary} />
          <Text style={[styles.configButtonText, { color: colors.text }]}>AJUSTAR</Text>
        </Pressable>
      </View>

      {/* Grid Bento com Cards Arredondados (borderRadius 24) e Ícones Vetoriais */}
      <View style={styles.grid}>
        {categories.map((cat) => {
          const spent = getCategorySpent(cat.id);
          const percent =
            cat.budgetLimit > 0 ? Math.min(Math.round((spent / cat.budgetLimit) * 100), 200) : 0;
          const isWarning = cat.budgetLimit > 0 && percent >= 85;
          const isExceeded = cat.budgetLimit > 0 && percent >= 100;
          const IconComponent = getCategoryIcon(cat.icon);

          return (
            <Pressable
              key={cat.id}
              onPress={() => onOpenBudgetManager(cat.id)}
              style={({ pressed }) => [
                styles.bentoCard,
                {
                  backgroundColor: isWarning
                    ? 'rgba(255, 59, 48, 0.08)'
                    : mode === 'dark'
                    ? colors.surface
                    : colors.surfaceElevated,
                  borderColor: isWarning ? 'rgba(255, 59, 48, 0.32)' : colors.border,
                  opacity: pressed ? 0.9 : 1,
                },
              ]}
            >
              {/* Topo do Card: Ícone Vetorial Lucide + Nome + Badge Pill de Percentual */}
              <View style={styles.cardHeader}>
                <View
                  style={[
                    styles.iconBox,
                    {
                      backgroundColor: isWarning
                        ? 'rgba(255, 59, 48, 0.16)'
                        : `${cat.color || colors.primary}18`,
                    },
                  ]}
                >
                  <IconComponent
                    size={14}
                    color={isWarning ? '#FF3B30' : cat.color || colors.primary}
                  />
                </View>

                <View
                  style={[
                    styles.percentBadge,
                    {
                      backgroundColor: isWarning
                        ? 'rgba(255, 59, 48, 0.18)'
                        : colors.surfaceSubtle,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.percentText,
                      { color: isWarning ? '#FF3B30' : colors.primary },
                    ]}
                  >
                    {cat.budgetLimit > 0 ? `${percent}%` : 'SEM META'}
                  </Text>
                </View>
              </View>

              {/* Nome da Categoria */}
              <View style={styles.nameRow}>
                {isWarning && <AlertTriangle size={11} color="#FF3B30" style={{ marginRight: 4 }} />}
                <Text
                  style={[
                    styles.categoryName,
                    { color: isWarning ? '#FF3B30' : colors.text },
                  ]}
                  numberOfLines={1}
                >
                  {cat.name.toUpperCase()}
                </Text>
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
                  {cat.budgetLimit > 0 ? `/ ${formatBRL(cat.budgetLimit)}` : '/ Sem teto'}
                </Text>
              </View>

              {/* Medidor Suave com Barra Arredondada */}
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
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
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
    padding: 16,
    borderRadius: 24,
    borderWidth: 1,
    justifyContent: 'space-between',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  percentBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  percentText: {
    fontFamily: Typography.bold,
    fontSize: 10,
    fontVariant: ['tabular-nums'],
    letterSpacing: 0.4,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  categoryName: {
    fontFamily: Typography.bold,
    fontSize: 11,
    letterSpacing: 0.8,
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
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  fill: {
    height: 4,
    borderRadius: 2,
  },
});
